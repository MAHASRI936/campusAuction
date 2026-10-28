import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import ConfigMissing from './components/ConfigMissing.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import HomePage from './pages/HomePage.jsx';
import BrowsePage from './pages/BrowsePage.jsx';
import AuctionDetailPage from './pages/AuctionDetailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SellPage from './pages/SellPage.jsx';
import EditListingPage from './pages/EditListingPage.jsx';
import MyListingsPage from './pages/MyListingsPage.jsx';
import MyBidsPage from './pages/MyBidsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { isSupabaseConfigured } from './lib/supabaseClient.js';

export default function App() {
  if (!isSupabaseConfigured) return <ConfigMissing />;

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/auctions" element={<BrowsePage />} />
        <Route path="/auctions/:id" element={<AuctionDetailPage />} />
        <Route
          path="/auctions/:id/edit"
          element={
            <RequireAuth reason="Please log in to edit your listing.">
              <EditListingPage />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/sell"
          element={
            <RequireAuth reason="Please log in or create an account to sell an item.">
              <SellPage />
            </RequireAuth>
          }
        />
        <Route
          path="/my-listings"
          element={
            <RequireAuth reason="Please log in to see your listings.">
              <MyListingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/my-bids"
          element={
            <RequireAuth reason="Please log in to see your bids.">
              <MyBidsPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
