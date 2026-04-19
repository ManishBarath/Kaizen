import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { LogIn, UserPlus, Flame, Loader2 } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

export const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleGoogleSuccess = async (response: CredentialResponse) => {
        setLoading(true);
        setError(null);
        try {
            const data = { token: response.credential, provider: 'Google' };
            const apiRes = await authApi.login(data);
            if (apiRes.data.isSuccess) {
                localStorage.setItem('USER_ID', apiRes.data.userId);
                navigate('/dashboard');
            } else {
                setError(apiRes.data.errorMessage || 'Google Auth failed.');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const data = { email, password, provider: 'EmailPassword' };
            const response = isLogin 
                ? await authApi.login(data)
                : await authApi.register(data);

            if (response.data.isSuccess) {
                // In future: Save genuine JWT to localStorage
                localStorage.setItem('USER_ID', response.data.userId);
                navigate('/dashboard');
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.response?.data?.error || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-sky-50 via-blue-50 to-indigo-100  px-4 py-10 sm:px-6 lg:px-10 flex items-center justify-center">
            <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200  bg-white shadow-[0_25px_60px_rgba(15,23,42,0.12)]">
                <div className="grid lg:grid-cols-2">
                    <div className="hidden lg:flex flex-col justify-between p-10 bg-blue-50 text-slate-900  ">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-2xl bg-white text-slate-800 flex items-center justify-center ">
                                    <Flame className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-black uppercase tracking-[0.3em] bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Kaizen</p>
                                    <h1 className="text-2xl font-extrabold tracking-tight mt-1">Build momentum daily</h1>
                                </div>
                            </div>
                            <p className="mt-6 text-sm text-slate-600 leading-relaxed ">
                                A clean, focused system to plan habits, measure progress, and stay consistent.
                            </p>
                        </div>
                        <div className="space-y-3 text-sm text-slate-600 ">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                Weekly goals aligned with outcomes
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-400" />
                                Daily journal for clarity and focus
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-sky-400" />
                                Visual insights across the month
                            </div>
                        </div>
                    </div>

                    <div className="p-8 sm:p-10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-blue-700 ">
                                <Flame className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Welcome</p>
                                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 ">
                                    {isLogin ? 'Sign in to your space' : 'Create your account'}
                                </h2>
                            </div>
                        </div>

                        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-100">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 ">Email address</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="mt-2 block w-full rounded-xl border border-slate-200  bg-white  px-4 py-3 text-sm text-slate-900  shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 :ring-blue-900/40"
                                        placeholder="email"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 ">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="mt-2 block w-full rounded-xl border border-slate-200  bg-white  px-4 py-3 text-sm text-slate-900  shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 :ring-blue-900/40"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative flex w-full justify-center rounded-xl bg-blue-600 py-3.5 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50  :bg-blue-700"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        {isLogin ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                                        {isLogin ? 'Sign in' : 'Create account'}
                                    </span>
                                )}
                            </button>

                            <div className="relative mt-6 flex items-center justify-center">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-slate-200 "></div>
                                </div>
                                <div className="relative flex justify-center text-xs font-semibold uppercase tracking-[0.2em]">
                                    <span className="bg-white  px-4 text-slate-400">Or continue with</span>
                                </div>
                            </div>

                            <div className="flex justify-center mt-5">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError('Google Login Failed')}
                                    useOneTap
                                    theme="outline"
                                    shape="pill"
                                />
                            </div>
                        </form>

                        <div className="text-center mt-6">
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-500 transition"
                            >
                                {isLogin
                                    ? "Don't have an account? Sign up"
                                    : 'Already have an account? Sign in'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
