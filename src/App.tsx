import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import LandlordRegister from "@/pages/LandlordRegister";
import NotFound from "@/pages/NotFound";
import LandlordLayout from "@/layouts/LandlordLayout";
import LandlordDashboard from "@/pages/landlord/Dashboard";
import LandlordRooms from "@/pages/landlord/Rooms";
import LandlordTenants from "@/pages/landlord/Tenants";
import LandlordPayments from "@/pages/landlord/Payments";
import LandlordTickets from "@/pages/landlord/Tickets";
import LandlordAnnouncements from "@/pages/landlord/Announcements";
import LandlordSettings from "@/pages/landlord/Settings";
import LandlordQRCode from "@/pages/landlord/QRCode";
import TenantLayout from "@/layouts/TenantLayout";
import TenantHome from "@/pages/tenant/Home";
import TenantPay from "@/pages/tenant/Pay";
import TenantRequests from "@/pages/tenant/Requests";
import TenantReceipts from "@/pages/tenant/Receipts";
import TenantProfile from "@/pages/tenant/Profile";

const queryClient = new QueryClient();

const IndexRedirect = () => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={role === 'landlord' ? '/landlord' : '/tenant'} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<IndexRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup/landlord" element={<LandlordRegister />} />

            <Route path="/landlord" element={<ProtectedRoute requiredRole="landlord"><LandlordLayout /></ProtectedRoute>}>
              <Route index element={<LandlordDashboard />} />
              <Route path="rooms" element={<LandlordRooms />} />
              <Route path="tenants" element={<LandlordTenants />} />
              <Route path="payments" element={<LandlordPayments />} />
              <Route path="tickets" element={<LandlordTickets />} />
              <Route path="announcements" element={<LandlordAnnouncements />} />
              <Route path="settings" element={<LandlordSettings />} />
              <Route path="qrcode" element={<LandlordQRCode />} />
            </Route>

            <Route path="/tenant" element={<ProtectedRoute requiredRole="tenant"><TenantLayout /></ProtectedRoute>}>
              <Route index element={<TenantHome />} />
              <Route path="pay" element={<TenantPay />} />
              <Route path="requests" element={<TenantRequests />} />
              <Route path="receipts" element={<TenantReceipts />} />
              <Route path="profile" element={<TenantProfile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
