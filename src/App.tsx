/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ApartmentDetails from './pages/ApartmentDetails';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-royal-50 flex flex-col font-sans selection:bg-gold-500 selection:text-white" dir="rtl">
        <Navbar />
        <main className="flex-grow">

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/apartment/:id" element={<ApartmentDetails />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
