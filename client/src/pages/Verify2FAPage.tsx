import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth, useVerify } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function Verify2FAPage() {
  const { data: user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const verify = useVerify();
  const [code, setCode] = useState('');

  const tempToken = location.state?.tempToken;
  if (!tempToken) return <Navigate to="/login" replace />;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verify.mutateAsync({ tempToken, code });
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-gray-900 p-8 rounded-xl border border-gray-800">
        <h2 className="text-xl font-semibold">Verification Code</h2>
        <p className="text-gray-400">Enter the 6‑digit code sent to your email.</p>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={verify.isLoading}>
          {verify.isLoading ? 'Verifying...' : 'Verify'}
        </Button>
      </form>
    </div>
  );
}
