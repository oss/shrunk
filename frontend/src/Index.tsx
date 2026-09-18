import { createRoot } from 'react-dom/client';
import { App } from '@/App/App';
import AppErrorBoundary from '@/App/AppErrorBoundary';
import './Index.css';

const container = document.getElementById('react');
const root = createRoot(container!);
root.render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
