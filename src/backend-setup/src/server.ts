import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Import routes
import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import adminRoutes from './routes/admin.routes';
import enrollmentRoutes from './routes/enrollment.routes';
import subjectRoutes from './routes/subject.routes';
import transactionRoutes from './routes/transaction.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import facultyRoutes from './routes/faculty.routes';
import gradesRoutes from './routes/grades.routes';
import registrarRoutes from './routes/registrar.routes';
import deanRoutes from './routes/dean.routes';
import superadminRoutes from './routes/superadmin.routes';
import analyticsRoutes from './routes/analytics.routes';
import logsRoutes from './routes/logs.routes';
import formsRoutes from './routes/forms.routes';
import notificationsRoutes from './routes/notifications.routes';
import coursesRoutes from './routes/courses.routes';
import paymentsRoutes from './routes/payments.routes';
import curriculumRoutes from './routes/curriculum.routes';
import cashierRoutes from './routes/cashier.routes';
import reportsRoutes from './routes/reports.routes';
import scholarshipRoutes from './routes/scholarship.routes';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    /^http:\/\/192\.168\..*:[0-9]+$/,
    /^http:\/\/10\..*:[0-9]+$/
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger for debugging (dev only)
app.use((req, _res, next) => {
  console.log(`[req] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Static files for uploads
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const documentsDir = path.join(uploadsDir, 'documents');
try {
  fs.mkdirSync(documentsDir, { recursive: true });
} catch (e) {
  console.error('Failed to create uploads directory', e);
}

app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/registrar', registrarRoutes);
app.use('/api/dean', deanRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/admin/forms', formsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/scholarships', scholarshipRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Enrollment System API is running' });
});

// Debug route: list registered routes (dev only)
app.get('/api/debug/routes', (req: Request, res: Response) => {
  try {
    const routes: string[] = [];
    // @ts-ignore - express types
    app._router.stack.forEach((middleware: any) => {
      if (middleware.route) {
        // routes registered directly on the app
        const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
        routes.push(`${methods} ${middleware.route.path}`);
      } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
        // router middleware
        middleware.handle.stack.forEach((handler: any) => {
          const route = handler.route;
          if (route) {
            const methods = Object.keys(route.methods).join(',').toUpperCase();
            routes.push(`${methods} ${route.path}`);
          }
        });
      }
    });

    res.json({ success: true, routes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to list routes', error: String(err) });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// JSON 404 fallback to aid debugging (dev)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Not found',
    method: req.method,
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, '0.0.0.0' as any, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Enrollment System API - Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Listening on all network interfaces (0.0.0.0:${PORT})`);
});

export default app;
