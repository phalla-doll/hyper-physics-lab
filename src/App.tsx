import React, { useState } from 'react';
import Layout from './components/Layout';
import Tesseract from './pages/Tesseract';
import DoublePendulum from './pages/DoublePendulum';

export default function App() {
  const [activeTab, setActiveTab] = useState('tesseract');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'tesseract' && <Tesseract isActive={activeTab === 'tesseract'} />}
      {activeTab === 'pendulum' && <DoublePendulum isActive={activeTab === 'pendulum'} />}
    </Layout>
  );
}
