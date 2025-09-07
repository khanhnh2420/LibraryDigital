// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/layout/DashboardLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import Books from "@/pages/Books";
import BookDetail from "@/pages/BookDetail";
import BookEdit from "@/pages/BookEdit";
import Login from "@/pages/Login";
import Categories from "@/pages/Categories";
import Authors from "@/pages/Authors";
import Publishers from "@/pages/Publishers";
import Loans from "@/pages/Loans";
import Users from "@/pages/Users";
import Forbidden from "@/pages/Forbidden"; // trang 403

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute roles={['admin','librarian']} />}>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="books" element={<Books />} />
          <Route path="books/:id" element={<BookDetail />} />
          <Route path="books/:id/edit" element={<BookEdit />} />
          <Route path="categories" element={<Categories />} />
          <Route path="authors" element={<Authors />} />
          <Route path="/publishers" element={<Publishers />} />
          <Route path="loans" element={<Loans />} />
          <Route path="users" element={<Users />} />
        </Route>
      </Route>

      <Route path="/403" element={<Forbidden />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
