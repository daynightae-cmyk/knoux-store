# Foundation schema reference

The generated type contract is preserved from ff902822 (foundation schema only). It is intentionally not the runtime client generic: deployed Signal and bridge tables were added subsequently. The foundation migrations and seed generator are canonical under supabase/ and scripts/. Contact persistence in the old branch is superseded by the guarded Resend/webhook intake: it omitted same-origin, bounded-body and rate protections and changed the existing delivery contract. No remote data was modified during recovery.
