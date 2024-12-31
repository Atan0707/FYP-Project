import LoginForm from './form';

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-center mb-6">Log In</h1>
      <LoginForm />
      <p className="text-center mt-4">
        Don&apos;t have an account?{' '}
        <a href="/pages/signup" className="text-blue-600 hover:underline">
          Sign up
        </a>
      </p>
    </div>
  );
}
