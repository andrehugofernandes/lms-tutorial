// Temporary mock of auth() until Firebase is implemented
export const auth = () => {
  return {
    userId: "mock-user-id"
  };
};

export const useAuth = () => {
  return {
    userId: "mock-user-id"
  };
};

export const currentUser = async () => {
  return {
    id: "mock-user-id",
    firstName: "Mock",
    lastName: "User",
    emailAddresses: [{ emailAddress: "mock@example.com" }]
  };
};
