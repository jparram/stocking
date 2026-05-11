import { Link } from 'react-router-dom';

export default function FitnessProgramNew() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">New Program</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Program setup will live here. For now, this route is available from the Fitness home screen instead of
          falling through to a 404 page.
        </p>
      </div>

      <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
        <div className="text-4xl">🗂️</div>
        <h2 className="mt-3 text-lg font-semibold text-brand-text">Program builder coming next</h2>
        <p className="mt-2 text-sm text-brand-muted">
          Use the Fitness home page to review your active plan and recent sessions until the dedicated program editor
          lands.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/fitness"
            className="rounded-lg bg-sams px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sams-dark"
          >
            Back to Fitness
          </Link>
        </div>
      </section>
    </div>
  );
}
