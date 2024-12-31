import SignUpForm from './form';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/pages/login" className="text-blue-500 hover:text-blue-600">
              Sign in
            </a>
          </p>
        </div>

        <SignUpForm />
      </div>
    </div>
  );
}