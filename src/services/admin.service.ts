import api, { handleApiError } from '../utils/api';

class AdminService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<any> {
    try {
      const response = await api.get('/admin/dashboard/stats');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get all students with optional filters
   */
  async getAllStudents(filters?: {
    student_type?: string;
    status?: string;
    search?: string;
  }): Promise<any> {
    try {
      const response = await api.get('/admin/students', { params: filters });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get student by ID with enrollments and documents
   */
  async getStudentById(id: number): Promise<any> {
    try {
      const response = await api.get(`/admin/students/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Create new student
   */
  async createStudent(studentData: {
    username?: string;
    password?: string;
    email?: string;
    student_id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    suffix?: string;
    student_type: string;
    course?: string;
    year_level?: number;
    contact_number?: string;
    address?: string;
    birth_date?: string;
    gender?: string;
  }): Promise<any> {
    try {
      const response = await api.post('/admin/students', studentData);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Update student information
   */
  async updateStudent(id: number, studentData: any): Promise<any> {
    try {
      const response = await api.put(`/admin/students/${id}`, studentData);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Delete student (superadmin only)
   */
  async deleteStudent(id: number): Promise<any> {
    try {
      const response = await api.delete(`/admin/students/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  async createAccountsForExistingStudents(): Promise<any> {
    try {
      const response = await api.post('/admin/students/create-accounts');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get all enrollments with filters
   */
  async getAllEnrollments(filters?: {
    status?: string;
    school_year?: string;
    semester?: string;
  }): Promise<any> {
    try {
      const response = await api.get('/admin/enrollments', { params: filters });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get enrollment details with subjects and transactions
   */
  async getEnrollmentById(id: number): Promise<any> {
    try {
      const response = await api.get(`/admin/enrollments/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get documents for an enrollment
   */
  async getEnrollmentDocuments(enrollmentId: number): Promise<any> {
    try {
      const response = await api.get(`/admin/enrollments/${enrollmentId}/documents`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Update enrollment status
   */
  async updateEnrollmentStatus(
    id: number,
    status: string,
    remarks?: string
  ): Promise<any> {
    try {
      const response = await api.put(`/admin/enrollments/${id}/status`, {
        status,
        remarks,
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Approve enrollment
   */
  async approveEnrollment(id: number, remarks?: string): Promise<any> {
    // Use the dedicated approve-assessment endpoint which transitions to 'For Subject Selection'
    return this.approveEnrollmentAssessment(id, remarks);
  }

  /**
   * Reject enrollment
   */
  async rejectEnrollment(id: number, remarks?: string): Promise<any> {
    return this.updateEnrollmentStatus(id, 'Rejected', remarks);
  }

  /**
   * Assess enrollment
   */
  async assessEnrollment(id: number, remarks?: string): Promise<any> {
    return this.updateEnrollmentStatus(id, 'Assessed', remarks);
  }

  /**
   * Approve enrollment assessment (moves to "For Subject Selection")
   */
  async approveEnrollmentAssessment(id: number, remarks?: string): Promise<any> {
    try {
      const response = await api.put(`/admin/enrollments/${id}/approve-assessment`, { remarks });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Forms/templates management
  async listTemplates(): Promise<any> {
    try {
      const response = await api.get('/admin/forms');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  async uploadTemplate(file: File): Promise<any> {
    try {
      const form = new FormData();
      form.append('template', file);
      const response = await api.post('/admin/forms', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  async deleteTemplate(name: string): Promise<any> {
    try {
      const response = await api.delete(`/admin/forms/${encodeURIComponent(name)}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get all installment payments
   */
  async getAllInstallmentPayments(): Promise<any> {
    try {
      const response = await api.get('/payments/installments');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Update installment payment status
   */
  async updateInstallmentPaymentStatus(id: number, status: string): Promise<any> {
    try {
      const response = await api.put(`/payments/installments/${id}`, { status });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get pending account requests
   */
  async getPendingAccountRequests(): Promise<any> {
    try {
      const response = await api.get('/admin/account-requests');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Approve account request
   */
  async approveAccountRequest(id: number): Promise<any> {
    try {
      const response = await api.put(`/admin/account-requests/${id}/approve`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Reject account request
   */
  async rejectAccountRequest(id: number, reason?: string): Promise<any> {
    try {
      const response = await api.put(`/admin/account-requests/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get audit trail - all modifications by non-student roles
   */
  async getAuditTrail(params?: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const response = await api.get('/admin/audit-trail', { params });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const adminService = new AdminService();