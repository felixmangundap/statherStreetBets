import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: 'mx-auto',
          card: 'bg-zinc-900 border border-zinc-800 shadow-2xl',
          headerTitle: 'text-zinc-100',
          headerSubtitle: 'text-zinc-400',
          socialButtonsBlockButton:
            'bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700',
          formFieldInput:
            'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500',
          formFieldLabel: 'text-zinc-300',
          footerActionLink: 'text-emerald-500 hover:text-emerald-400',
          formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
        },
      }}
    />
  )
}
