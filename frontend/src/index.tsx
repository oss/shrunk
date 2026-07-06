import { createRoot } from 'react-dom/client';
import Shrunk from '@/Shrunk';
import './index.css';

const container = document.getElementById('react');
const root = createRoot(container!);
root.render(<Shrunk siderWidth={150} />);
