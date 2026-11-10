import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import InternalLayout from './components/internal/InternalLayout';
import VendorLayout from './components/vendor/VendorLayout';

import LoginSelection from './pages/LoginSelection';
import InternalLogin from './pages/InternalLogin';
import VendorLogin from './pages/VendorLogin';

import Dashboard from './pages/internal/Dashboard';
import Applications from './pages/internal/Applications';
import CreateApplication from './pages/internal/CreateApplication';
import ApplicationDetails from './pages/internal/ApplicationDetails';
import VendorComparison from './pages/internal/VendorComparison';
import ManualReview from './pages/internal/ManualReview';
import ReviewDetails from './pages/internal/ReviewDetails';
import AuditLogs from './pages/internal/AuditLogs';

import VendorDashboard from './pages/vendor/VendorDashboard';
import MyApplications from './pages/vendor/MyApplications';
import VendorApplicationDetails from './pages/vendor/VendorApplicationDetails';
import SubmitVerification from './pages/vendor/SubmitVerification';
import SubmissionHistory from './pages/vendor/SubmissionHistory';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginSelection />} />
      <Route path="/internal/login" element={<InternalLogin />} />
      <Route path="/vendor/login" element={<VendorLogin />} />

      <Route
        path="/internal"
        element={
          <ProtectedRoute portal="INTERNAL">
            <InternalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="applications" element={<Applications />} />
        <Route path="applications/:id" element={<ApplicationDetails />} />
        <Route path="create-application" element={<CreateApplication />} />
        <Route path="comparison" element={<VendorComparison />} />
        <Route path="manual-review" element={<ManualReview />} />
        <Route path="manual-review/:id" element={<ReviewDetails />} />
        <Route path="audit-logs" element={<AuditLogs />} />
      </Route>

      <Route
        path="/vendor"
        element={
          <ProtectedRoute portal="VENDOR">
            <VendorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<VendorDashboard />} />
        <Route path="applications" element={<MyApplications />} />
        <Route path="applications/:id" element={<VendorApplicationDetails />} />
        <Route path="applications/:id/submit" element={<SubmitVerification />} />
        <Route path="history" element={<SubmissionHistory />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
