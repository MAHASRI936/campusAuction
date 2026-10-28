import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';

export default function NotFoundPage() {
  return (
    <div className="container-page py-16">
      <EmptyState
        title="Page not found"
        message="The page you are looking for doesn't exist."
        action={
          <Link to="/" className="btn-primary">
            Go to homepage
          </Link>
        }
      />
    </div>
  );
}
