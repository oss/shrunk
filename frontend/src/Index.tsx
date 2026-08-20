import { createRoot } from 'react-dom/client';
import Shrunk from '@/Shrunk';
import AppErrorBoundary from '@/Components/AppErrorBoundary';
import './Index.css';

const container = document.getElementById('react');
const root = createRoot(container!);
root.render(
  <AppErrorBoundary>
    <Shrunk siderWidth={150} />
  </AppErrorBoundary>,
);
