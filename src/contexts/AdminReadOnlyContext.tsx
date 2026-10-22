import { createContext, useContext } from "react";
export const AdminReadOnlyContext = createContext(false);
export const useAdminReadOnly = () => useContext(AdminReadOnlyContext);
