import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

const LandlordRegister = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [boardingHouseName, setBoardingHouseName] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName, 'landlord');
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Account created! Please check your email to verify.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Back button */}
        <Link
          to="/signup"
          className="inline-flex items-center text-[#4a6741] mb-6 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {/* Header */}
        <h1 className="text-2xl font-bold text-[#1a2e1a] mb-1">Register as Landlord</h1>
        <p className="text-sm text-[#6b7a6b] mb-6">Create your account to manage your boarding house</p>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Personal info */}
          <Input
            id="fullName"
            placeholder="Full name *"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            className="rounded-xl border border-[#d8d8d0] bg-white h-12 px-4 text-sm placeholder:text-[#9aa09a] focus-visible:ring-[#4a6741] focus-visible:border-[#4a6741]"
          />
          <Input
            id="email"
            type="email"
            placeholder="Email address *"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="rounded-xl border border-[#d8d8d0] bg-white h-12 px-4 text-sm placeholder:text-[#9aa09a] focus-visible:ring-[#4a6741] focus-visible:border-[#4a6741]"
          />
          <Input
            id="phone"
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="rounded-xl border border-[#d8d8d0] bg-white h-12 px-4 text-sm placeholder:text-[#9aa09a] focus-visible:ring-[#4a6741] focus-visible:border-[#4a6741]"
          />

          {/* Divider + Property Details */}
          <div className="pt-3">
            <hr className="border-[#d8d8d0] mb-4" />
            <p className="text-xs font-semibold tracking-widest text-[#4a5c4a] uppercase mb-3">
              Property Details
            </p>
            <div className="space-y-3">
              <Input
                id="boardingHouseName"
                placeholder="Boarding house name *"
                value={boardingHouseName}
                onChange={e => setBoardingHouseName(e.target.value)}
                required
                className="rounded-xl border border-[#d8d8d0] bg-white h-12 px-4 text-sm placeholder:text-[#9aa09a] focus-visible:ring-[#4a6741] focus-visible:border-[#4a6741]"
              />
              <Input
                id="address"
                placeholder="Full Address *"
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
                className="rounded-xl border border-[#d8d8d0] bg-white h-12 px-4 text-sm placeholder:text-[#9aa09a] focus-visible:ring-[#4a6741] focus-visible:border-[#4a6741]"
              />
            </div>
          </div>

          {/* Divider + Security */}
          <div className="pt-3">
            <hr className="border-[#d8d8d0] mb-4" />
            <p className="text-xs font-semibold tracking-widest text-[#4a5c4a] uppercase mb-3">
              Security
            </p>
            <div className="space-y-3">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password *"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-xl border border-[#d8d8d0] bg-white h-12 px-4 text-sm placeholder:text-[#9aa09a] focus-visible:ring-[#4a6741] focus-visible:border-[#4a6741] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7a6b] hover:text-[#1a2e1a] focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password *"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-xl border border-[#d8d8d0] bg-white h-12 px-4 text-sm placeholder:text-[#9aa09a] focus-visible:ring-[#4a6741] focus-visible:border-[#4a6741] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7a6b] hover:text-[#1a2e1a] focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-2xl bg-[#1e4d2b] hover:bg-[#163a20] text-white font-semibold text-base transition-colors"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default LandlordRegister;
