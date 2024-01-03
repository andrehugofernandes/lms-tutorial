const AuthLayout = ({ children
}: { 
  children: React.ReactNode 
}) => {
  return ( 
     <div className="flex flex-col items-center justify-center h-full
     min-h-screen w-full py-2">
      {children}
    </div> );
}
 
export default AuthLayout;