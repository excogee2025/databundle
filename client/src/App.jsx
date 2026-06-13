import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import BundlesPage from './pages/BundlesPage';
import CheckoutPage from './pages/CheckoutPage';
import TrackPage from './pages/TrackPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AgentDashboard from './pages/AgentDashboard';
import WalletPage from './pages/WalletPage';
import NotificationsPage from './pages/NotificationsPage';
import SupportPage from './pages/SupportPage';
import ReportsPage from './pages/ReportsPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import MockPayPage, { PaymentCallbackPage } from './pages/PaymentPages';

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/bundles" element={<BundlesPage />} />
            <Route path="/checkout/:bundleId" element={<CheckoutPage />} />
            <Route path="/checkout/mock-pay" element={<MockPayPage />} />
            <Route path="/checkout/callback" element={<PaymentCallbackPage />} />
            <Route path="/track" element={<TrackPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agent" element={<AgentDashboard />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </Layout>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: '12px', fontSize: '14px' },
            success: { iconTheme: { primary: '#10b981' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
