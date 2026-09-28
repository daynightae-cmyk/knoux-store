import { repositoryLedger, type RepositoryClass } from '@/data/software';

/**
 * Repository ledger.
 *
 * The published form of the audit. It exists so the classification is
 * inspectable: a reader can see which repositories were considered, which were
 * published, and which were held back and why.
 */
const CLASS_TONE: Record<RepositoryClass, string> = {
  'CANONICAL PRODUCT': 'class-cell--bright',
  LAB: '',
  PLACEHOLDER: 'class-cell--muted',
  DUPLICATE: 'class-cell--muted',
  'STORE / INFRASTRUCTURE': 'class-cell--muted',
  'EXTERNAL / CLIENT / NON-KNOUX': 'class-cell--muted',
};

export function RepositoryLedger() {
  const rows = repositoryLedger.filter((record) => record.classification !== 'EXTERNAL / CLIENT / NON-KNOUX');

  return (
    <div style={{ marginTop: 26 }}>
      <table className="ledger">
        <caption className="visually-hidden">
          KNOuX-branded repositories and their publication classification.
        </caption>
        <thead>
          <tr>
            <th scope="col">Repository</th>
            <th scope="col">Classification</th>
            <th scope="col">Basis</th>
            <th scope="col">Published</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((record) => (
            <tr key={record.repository}>
              <td>{record.repository}</td>
              <td className={`class-cell ${CLASS_TONE[record.classification] ?? ''}`.trim()}>{record.classification}</td>
              <td>{record.basis}</td>
              <td className="class-cell class-cell--muted">{record.published ? 'YES' : 'NO'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="meta-row" style={{ marginTop: 22 }}>
        <span>Repositories outside the KNOuX catalogue are not listed here</span>
        <span>Public catalog: {rows.filter((row) => row.published).length} of {rows.length}</span>
      </p>
    </div>
  );
}
