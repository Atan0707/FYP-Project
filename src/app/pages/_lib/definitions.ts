export type User = {
  id: string;
  email: string;
  fullName: string;
  ic: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SignupFormData = {
  email: string;
  password: string;
  fullName: string;
  ic: string;
  phone: string;
};
