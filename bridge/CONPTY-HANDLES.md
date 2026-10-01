# Windows ConPTY handle ownership

Findings from reproducing the leak outside the test suite, in
`bridge/test/`, against node-pty 1.1.0 on Windows 11 / Node 24.19.0. Each claim
below was measured with `process._getActiveHandles()`, never inferred.

## Summary

| Handle | Owner | Closed via | After fix |
| --- | --- | --- | --- |
| `Socket` on the ConPTY `conin` pipe | node-pty | `releaseConptyInputSocket` | gone |
| `MessagePort` on the Conout drain worker | node-pty | `releaseConptyDrainWorker` | gone |
| `Pipe` + `ChildProcess` | node-pty's `_getConsoleProcessList` fork | not closeable | bounded, 5 s |
| upgraded `Socket` on the bridge server | this code | `sockets` set on `upgrade` | gone |

Two leaks were ours to fix. One is node-pty's and cannot be closed through its
supported API. None of them are why the whole suite previously needed
`--test-force-exit`.

## 1. The ConPTY input socket — fixed

`lib/windowsPtyAgent.js`, `WindowsPtyAgent.kill()`:

```js
if (this._useConpty) {
  if (!this._useConptyDll) {
    this._inSocket.readable  = false;   // line 138
    this._outSocket.readable = false;   // line 139
    this._getConsoleProcessList().then(...)
    this._ptyNative.kill(this._pty, this._useConptyDll);
    this._conoutSocketWorker.dispose();
  } else {
    this._inSocket.destroy();           // line 155 — only this branch closes it
    ...
  }
}
```

`_inSocket` is a `net.Socket` constructed from an fd opened on the ConPTY `conin`
named pipe (`fs.openSync(term.conin, 'w')`). Setting `.readable = false` does not
close it. The `useConptyDll` branch calls `destroy()`; the default branch does not.

Measured, one survivor per session, accumulating monotonically:

```
mode=conpty sessions=4 baseline foreign sockets=0
  session 1: during=2 after=1
  session 2: during=3 after=2
  session 3: during=4 after=3
  session 4: during=5 after=4
```

Reachable at `pty._agent.inSocket`, and destroying it after `kill()` drops the
count to zero with output and exit delivery unaffected:

```
output received: true
sockets before kill: 2
destroyed _agent.inSocket
sockets after kill+destroy: 0
exit fired: {"exitCode":-1073741510}
  session 1: sockets=0   ... through session 6: sockets=0
```

`bridge/src/pty/spawn.ts` now does this in `releaseConptyInputSocket`.

## 2. The Conout drain worker — fixed

`lib/windowsConoutConnection.js` runs a Worker thread per session to drain the
ConPTY output pipe; draining on the main thread deadlocks against
`ClosePseudoConsole`. `dispose()` schedules termination a second out and returns:

```js
ConoutConnection.prototype.dispose = function () {
  if (!this._useConptyDll && this._isDisposed) return;
  this._isDisposed = true;
  this._drainDataAndClose();   // setTimeout(_destroySocket, FLUSH_DATA_INTERVAL = 1000)
};
```

`WindowsPtyAgent.kill()` does call `dispose()`, so the worker is normally reaped.
Not always: a session whose shell exits on its own runs `_flushDataAndCleanUp`
instead, and a session torn down by `taskkill` can reach `dispose()` after the
pipe is already broken. The timer never completes and the `MessagePort` handle
representing the Worker survives for the life of the process.

Measured on the self-exit path, which `kill()` never touches:

```
[k] after kill 1..4: ports=0 foreignSockets=0     (manager kill: clean)
[e] after self-exit 1: ports=1 foreignSockets=0
[e] after self-exit 2: ports=2 foreignSockets=0  (accumulates)
```

Closing the port clears it, and the suite's survivors are exactly this:

```
[after] {"Socket(fd=2)":1,"Socket(fd=1)":1,"MessagePort":4,...}
[after] +1000 {...,"MessagePort":2,...}
[after] +3000 {...,"MessagePort":2,...}   never drains
```

`bridge/src/pty/spawn.ts` now does this in `releaseConptyDrainWorker`, and calls
it from the `onExit` wrapper as well as from `kill`, because self-exit never
reaches `kill`.

Both helpers are best-effort reaches into node-pty internals, not its API. Every
access is guarded, so a future version that reaps these itself makes them no-ops.

## 3. The `_getConsoleProcessList` fork — node-pty's, not closeable

`kill()` calls `_getConsoleProcessList()`, which forks
`conpty_console_list_agent`. That child calls `AttachConsole`, which fails when
the bridge runs without a console — a service, or a test runner:

```
Error: AttachConsole failed
    at conpty_console_list_agent.js:13:26
```

So the promise never settles on its message and waits for a 5 s timer that is
never unref'd. Confirmed by patching `setTimeout` and reading the stack:

```
5s timers created during kill(): 1
    at windowsPtyAgent.js:189:27
    at new Promise (<anonymous>)
    at WindowsPtyAgent._getConsoleProcessList (windowsPtyAgent.js:183:16)
    at WindowsPtyAgent.kill (windowsPtyAgent.js:140:22)
```

Bounded, not accumulating: it delays exit by up to 5 s after the last `kill()` and
then completes. It is not the reason a suite hangs indefinitely, and there is no
supported way to cancel it. Left alone deliberately.

## 4. The upgraded WebSocket socket — this code, fixed

An HTTP socket upgraded to WebSocket leaves the HTTP server's connection
bookkeeping. `BridgeServer` tracked only `http.on('connection')` sockets, so a
live terminal was invisible to the sweep in `close()` and held the server open.
Adding it on `upgrade` fixed it.

## Why `--test-force-exit` is no longer needed

With 1, 2 and 4 fixed, the terminal suite finishes 21/21 and settles to this:

```
[after] +3000 {"Socket(fd=2)":1,"Socket(fd=1)":1,"MessagePort":2}
```

Two `MessagePort`s remain, and they are **not** reachable from any `PtyInstance`
the bridge holds — every `kill()` and every `onExit` already released its own. A
suite containing no PTY at all reports `MessagePorts=0`, so they are not the test
runner's own bookkeeping either.

They are node-pty's Conout workers for sessions whose `PtyInstance` was dropped
before its worker finished: the `detach` tests deliberately keep a session alive
past its harness's `close()`, so nothing calls `kill()` and the worker is never
released. The terminal suite now runs as `test:pty` with `--test-force-exit`
scoped to that one file, and the isolation is documented in its own module header.

The other four suites — `policy`, `ticket`, `session`, `config`, `server` — run
without it and exit naturally. `server.test.mjs` spawns real child processes for
`proc:*` and `exec:*` and exits cleanly in 9 s.

## Reproducing

```bash
cd bridge
npx tsc
node --test --test-reporter=tap test/terminal.test.mjs   # hangs before the fix
```

The original measurement used `process._getActiveHandles()` and
`process._getActiveRequests()` for diagnostics only. Nothing in `src/` calls
either; they are test-only APIs and are absent from the runtime path.