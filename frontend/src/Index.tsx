import { createRoot } from 'react-dom/client';
import Shrunk from '@/Shrunk';
import './Index.css';

const container = document.getElementById('react');
const root = createRoot(container!);
root.render(<Shrunk siderWidth={150} />);
