import { useState, useEffect } from 'react';
import { API_SERVER_URL } from '../utils/api';
import { Button } from './ui/button';
import { 
  LogOut, 
  LayoutDashboard, 
  FileText,
  Users,
  ClipboardCheck,
  Award,
  Printer,
  Download,
  Search,
  Filter,
  Eye,
  Edit,
  CheckCircle,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Clock,
  BookOpen,
  X
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { registrarService } from '../services/registrar.service';
import { adminService } from '../services/admin.service';
import { gradesService } from '../services/grades.service';
import { maintenanceService } from '../services/maintenance.service';
import { subjectService } from '../services/subject.service';
import { enrollmentService } from '../services/enrollment.service';
import { cashierService } from '../services/cashier.service';

interface RegistrarDashboardProps {
  onLogout: () => void;
}

export default function RegistrarDashboard({ onLogout }: RegistrarDashboardProps) {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([]);
  const [assessDialogOpen, setAssessDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<{ type: 'approve' | 'reject'; enrollment: any } | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [previewDocumentsOpen, setPreviewDocumentsOpen] = useState(false);
  const [previewEnrollment, setPreviewEnrollment] = useState<any>(null);
  const [selectedEnrollmentForAssess, setSelectedEnrollmentForAssess] = useState<any>(null);
  const [subjectAssessmentDetails, setSubjectAssessmentDetails] = useState<any>(null);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [subjectFilters, setSubjectFilters] = useState({
    course: '',
    year_level: '',
    semester: ''
  });
  const [assessmentForm, setAssessmentForm] = useState({
    tuition: 0,
    registration: 0,
    library: 0,
    lab: 0,
    id_fee: 0,
    others: 0,
    remarks: '',
    scholarship_coverage: ''
  });
  const [courseFeeRates, setCourseFeeRates] = useState({ tuition_per_unit: 700, registration: 1500, library: 500, lab: 2000, id_fee: 200, others: 300 });

  const SCHOLARSHIP_DEFINITIONS: any = {
    'Merit Scholarship': {
      coverage: ['Highest Honors — 100%','High Honors — 50%'],
      duties: 'Complete 50 hours of Student Assistance Work per term and maintain grade requirements based on scholarship level.'
    },
    'Academic Scholarship': {
      coverage: ['GWA 1.25 — 100%','GWA 1.50 — 50%','GWA 1.75 — 20%'],
      duties: 'Complete 50 hours of Student Assistance Work per term and maintain required academic standing.'
    },
    'Financial Assistance Scholarship': {
      coverage: ['50% scholarship'],
      duties: 'No failing grades. Complete 50 hours of Student Assistance Work per term.'
    },
    'Working Student Scholarship': {
      coverage: ['MI ≤ ₱17,500 — 50%','MI ₱20,000–22,499 — 40%','MI ₱22,500–25,000 — 30%'],
      duties: 'Complete 50 hours of Student Assistance Work per term. Maximum residency: 7 years and 1 term.'
    },
    'Partnership Scholarships': {
      coverage: ['AFP/NBI/PNP — per MOU','LGU — 50%'],
      duties: 'No failing grades. Complete program within allotted time.'
    },
    'Promotional Scholarship Grants': {
      coverage: ['Depends on approved grant/campaign'],
      duties: 'Duties depend on terms of the approved campaign or grant.'
    }
  };

  const calculateTuition = (coverage: string | undefined) => {
    const baseTuition = 14000;
    if (!coverage) return baseTuition;

    if (coverage.includes('100%')) return 0;
    if (coverage.includes('50%')) return baseTuition * 0.5;
    if (coverage.includes('40%')) return baseTuition * 0.6;
    if (coverage.includes('30%')) return baseTuition * 0.7;
    if (coverage.includes('25%')) return baseTuition * 0.75;
    if (coverage.includes('20%')) return baseTuition * 0.8;
    
    return baseTuition;
  };

  const getTuitionDeduction = (coverage: string | undefined, baseTuition: number = 14000) => {
    if (!coverage) return 0;
    if (coverage.includes('100%')) return baseTuition;
    if (coverage.includes('50%')) return baseTuition * 0.5;
    if (coverage.includes('40%')) return baseTuition * 0.4;
    if (coverage.includes('30%')) return baseTuition * 0.3;
    if (coverage.includes('25%')) return baseTuition * 0.25;
    if (coverage.includes('20%')) return baseTuition * 0.2;
    return 0;
  };
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [studentRecords, setStudentRecords] = useState<any[]>([]);
  const [corRequests, setCorRequests] = useState<any[]>([]);
  const [clearanceRequests, setClearanceRequests] = useState<any[]>([]);
  const [gradeSubmissions, setGradeSubmissions] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [enrollmentReport, setEnrollmentReport] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<{ enrollmentId: number | null; sectionId: string }>({ enrollmentId: null, sectionId: '' });
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [viewStudentOpen, setViewStudentOpen] = useState(false);
  const [editStudentForm, setEditStudentForm] = useState<any>({});

  // Subject Management (Adding/Dropping) state
  const [smSearch, setSmSearch] = useState('');
  const [smStatusFilter, setSmStatusFilter] = useState('all');
  const [smStudents, setSmStudents] = useState<any[]>([]);
  const [smSelectedEnrollment, setSmSelectedEnrollment] = useState<any>(null);
  const [smEnrolledSubjects, setSmEnrolledSubjects] = useState<any[]>([]);
  const [smAvailableSubjects, setSmAvailableSubjects] = useState<any[]>([]);
  const [smAuditTrail, setSmAuditTrail] = useState<any[]>([]);
  const [smLoading, setSmLoading] = useState(false);
  const [smReason, setSmReason] = useState('');
  const [smEnrollmentData, setSmEnrollmentData] = useState<any>(null);

  // COR Management state
  const [corSearchTerm, setCorSearchTerm] = useState('');
  const [corPreviewOpen, setCorPreviewOpen] = useState(false);
  const [selectedCorForPreview, setSelectedCorForPreview] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeSection]);

  useEffect(() => {
    console.log('editStudentForm changed:', editStudentForm);
  }, [editStudentForm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      if (activeSection === 'Dashboard') {
        const statsResponse = await registrarService.getDashboardStats();
        if (statsResponse.success) {
          setDashboardStats(statsResponse.data);
        }
        const reportResp = await registrarService.getEnrollmentReport();
        if (reportResp.success) {
          setEnrollmentReport(reportResp.data);
        }
        // Fetch recent CORs and clearances for dashboard
        const corsResponse = await registrarService.getAllCORs({ status: 'Pending' });
        if (corsResponse.success) {
          setCorRequests(corsResponse.data?.slice(0, 5) || []);
        }
        const clearancesResponse = await registrarService.getAllClearances({ status: 'Pending' });
        if (clearancesResponse.success) {
          setClearanceRequests(clearancesResponse.data?.slice(0, 5) || []);
        }
      } else if (activeSection === 'Student Records') {
        const studentsResponse = await adminService.getAllStudents();
        if (studentsResponse.success) {
          setStudentRecords(studentsResponse.data || []);
        }
      } else if (activeSection === 'COR Management') {
        // Fetch enrolled students to display their CORs
        try {
          const resp = await registrarService.searchEnrolledStudents('', 'Enrolled');
          setCorRequests(resp?.data || []);
        } catch (err) {
          console.error('Error fetching enrolled students:', err);
          setCorRequests([]);
        }
      } else if (activeSection === 'Clearances') {
        const clearancesResponse = await registrarService.getAllClearances();
        if (clearancesResponse.success) {
          setClearanceRequests(clearancesResponse.data || []);
        }
      } else if (activeSection === 'Subject Management') {
        // Auto-load all enrolled students when tab is opened
        try {
          const resp = await registrarService.searchEnrolledStudents('', 'all');
          setSmStudents(resp?.data || []);
        } catch (err) {
          console.error('Auto-load enrolled students error:', err);
        }
      } else if (activeSection === 'Grades Management') {
        // Fetch both submitted (pending dean approval) and approved grades
        try {
          const submittedResp = await gradesService.getSubmittedGrades();
          const approvedResp = await gradesService.getApprovedGrades();
          
          // Service returns { success: true, data: [...] }, extract the data array
          const submitted = Array.isArray(submittedResp?.data) ? submittedResp.data : (Array.isArray(submittedResp) ? submittedResp : []);
          const approved = Array.isArray(approvedResp?.data) ? approvedResp.data : (Array.isArray(approvedResp) ? approvedResp : []);
          
          // Group grades by student name
          const studentMap = new Map<string, any>();
          
          // Process submitted grades (pending dean approval)
          submitted.forEach((grade: any) => {
            const key = grade.student_name || 'Unknown';
            if (!studentMap.has(key)) {
              studentMap.set(key, {
                student_name: grade.student_name,
                course: grade.course,
                year_level: grade.year_level,
                school_year: grade.school_year,
                semester: grade.semester,
                subjects: [],
                status: 'Submitted',
                date: new Date(grade.updated_at).toLocaleDateString(),
              });
            }
            const item = studentMap.get(key)!;
            item.subjects.push({
              subject_code: grade.subject_code,
              subject_name: grade.subject_name,
              grade: grade.grade,
              units: grade.units,
              updated_at: grade.updated_at,
              status: 'Submitted',
            });
          });
          
          // Process approved grades (dean approved)
          approved.forEach((grade: any) => {
            const key = grade.student_name || 'Unknown';
            if (!studentMap.has(key)) {
              studentMap.set(key, {
                student_name: grade.student_name,
                course: grade.course,
                year_level: grade.year_level,
                school_year: grade.school_year,
                semester: grade.semester,
                subjects: [],
                approved_by: grade.approved_by,
                status: 'Approved',
                date: new Date(grade.updated_at).toLocaleDateString(),
              });
            }
            const item = studentMap.get(key)!;
            // If all subjects for this student are approved, mark the student as Approved
            item.approved_by = grade.approved_by;
            
            const existing = item.subjects.find((s: any) => s.subject_code === grade.subject_code);
            if (existing) {
              existing.grade = grade.grade;
              existing.status = 'Approved';
            } else {
              item.subjects.push({
                subject_code: grade.subject_code,
                subject_name: grade.subject_name,
                grade: grade.grade,
                units: grade.units,
                updated_at: grade.updated_at,
                status: 'Approved',
              });
            }
            // Update student-level status based on whether all subjects are approved
            const allApproved = item.subjects.every((s: any) => s.status === 'Approved');
            item.status = allApproved ? 'Approved' : 'Submitted';
          });
          
          setGradeSubmissions(Array.from(studentMap.values()));
        } catch (err) {
          console.error('Failed to load grades:', err);
          setGradeSubmissions([]);
        }
        } else if (activeSection === 'Pending Enrollments') {
          // Fetch enrollments in both 'Pending Assessment' and 'For Admin Approval' status
          const pendingResp = await adminService.getAllEnrollments({ status: 'Pending Assessment' });
          const approvalResp = await adminService.getAllEnrollments({ status: 'For Admin Approval' });
          if (pendingResp || approvalResp) {
            const pending = pendingResp?.data || pendingResp || [];
            const approval = approvalResp?.data || approvalResp || [];
            setPendingEnrollments([...pending, ...approval]);
          }
          const sectionsResp = await maintenanceService.getAllSections();
          if (sectionsResp.success) {
            setSections(sectionsResp.data || []);
          }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCOR = async (enrollmentId: number) => {
    try {
      setError('');
      await registrarService.generateCOR(enrollmentId);
      fetchData();
      alert('COR generated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to generate COR');
    }
  };

  const openAssessDialog = async (enrollment: any) => {
    setSelectedEnrollmentForAssess(enrollment);
    const initialCoverage = enrollment.scholarship_type && enrollment.scholarship_type !== 'None'
      ? SCHOLARSHIP_DEFINITIONS[enrollment.scholarship_type]?.coverage?.[0]
      : '';
    
    // Fetch dynamic fee rates for this enrollment's course
    let rates = { tuition_per_unit: 700, registration: 1500, library: 500, lab: 2000, id_fee: 200, others: 300 };
    try {
      const feeData = await cashierService.getFees(enrollment.course);
      if (feeData && !Array.isArray(feeData)) {
        rates = { ...rates, ...feeData };
      } else if (Array.isArray(feeData)) {
        const match = feeData.find((f: any) => f.course === enrollment.course);
        if (match) rates = { ...rates, ...match };
      }
    } catch (e) { console.warn('Could not fetch course fees, using defaults'); }
    setCourseFeeRates(rates);
    
    setAssessmentForm({
      tuition: 0,
      registration: rates.registration,
      library: rates.library,
      lab: rates.lab,
      id_fee: rates.id_fee,
      others: rates.others,
      remarks: '',
      scholarship_coverage: initialCoverage
    });
    setAssessDialogOpen(true);
    try {
      const [detailsResp, subjResp] = await Promise.all([
        registrarService.getEnrollmentAssessmentDetails(enrollment.id),
        subjectService.getSubjectsByCourse(enrollment.course, enrollment.year_level, enrollment.semester)
      ]);
      const allSubjects: any[] = subjResp.success ? (subjResp.data || []) : [];
      const alreadyAdded: any[] = detailsResp.success ? (detailsResp.data?.subjects || []) : [];
      setAvailableSubjects(allSubjects);

      // Auto-add any subject not yet enrolled
      const alreadyIds = new Set(alreadyAdded.map((s: any) => s.subject_id));
      const toAdd = allSubjects.filter((s: any) => !alreadyIds.has(s.id));
      if (toAdd.length > 0) {
        await Promise.all(toAdd.map((s: any) => enrollmentService.addSubject(enrollment.id, s.id).catch(() => {})));
      }
      // Refresh after bulk-add
      const refreshed = await registrarService.getEnrollmentAssessmentDetails(enrollment.id);
      if (refreshed.success) {
        setSubjectAssessmentDetails(refreshed.data);
        const totalUnits = refreshed.data.subjects?.reduce((sum: number, s: any) => sum + (s.units || 0), 0) || 0;
        setAssessmentForm(prev => ({ ...prev, tuition: totalUnits * rates.tuition_per_unit }));
      } else {
        setSubjectAssessmentDetails(detailsResp.success ? detailsResp.data : null);
      }
    } catch (err) {
      console.error('Failed to load subjects for assessment:', err);
      setSubjectAssessmentDetails(null);
      setAvailableSubjects([]);
    }
  };

  const handleAddSubjectToEnrollment = async (subjectId: number) => {
    if (!selectedEnrollmentForAssess) return;
    try {
      setLoading(true);
      await enrollmentService.addSubject(selectedEnrollmentForAssess.id, subjectId);
      const resp = await registrarService.getEnrollmentAssessmentDetails(selectedEnrollmentForAssess.id);
      if (resp.success) {
        setSubjectAssessmentDetails(resp.data);
        const totalUnits = resp.data.subjects?.reduce((sum: number, s: any) => sum + (s.units || 0), 0) || 0;
        setAssessmentForm(prev => ({ ...prev, tuition: totalUnits * courseFeeRates.tuition_per_unit }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add subject');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSubjectFromEnrollment = async (subjectId: number) => {
    if (!selectedEnrollmentForAssess) return;
    try {
      setLoading(true);
      await enrollmentService.removeSubject(selectedEnrollmentForAssess.id, subjectId);
      const resp = await registrarService.getEnrollmentAssessmentDetails(selectedEnrollmentForAssess.id);
      if (resp.success) {
        setSubjectAssessmentDetails(resp.data);
        const totalUnits = resp.data.subjects?.reduce((sum: number, s: any) => sum + (s.units || 0), 0) || 0;
        setAssessmentForm(prev => ({ ...prev, tuition: totalUnits * courseFeeRates.tuition_per_unit }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove subject');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSection = async () => {
    if (!assignForm.enrollmentId || !assignForm.sectionId) return;
    try {
      setLoading(true);
      await registrarService.assignSection(assignForm.enrollmentId, Number(assignForm.sectionId));
      setAssignDialogOpen(false);
      setAssignForm({ enrollmentId: null, sectionId: '' });
      await fetchData();
      alert('Section assigned successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to assign section');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadScholarship = (path: string) => {
    const filename = path.split('/').pop();
    const token = localStorage.getItem('auth_token');
    const url = `${API_SERVER_URL}/api/registrar/scholarships/download/${filename}?token=${token}`;
    window.open(url, '_blank');
  };

  const handleDownloadDocument = (docId: number) => {
    const token = localStorage.getItem('auth_token');
    const url = `${API_SERVER_URL}/api/admin/documents/${docId}/download?token=${token}`;
    window.open(url, '_blank');
  };

  const handleAssessEnrollment = async () => {
    if (!selectedEnrollmentForAssess) return;
    if (!subjectAssessmentDetails?.subjects?.length) {
      alert('Please assign at least one subject before completing assessment.');
      return;
    }
    try {
      setLoading(true);
      // 1. Save fees (send actual post-scholarship tuition to backend)
      const finalTuition = assessmentForm.tuition - getTuitionDeduction(assessmentForm.scholarship_coverage, assessmentForm.tuition);
      const formToSubmit = { ...assessmentForm, tuition: finalTuition };
      await registrarService.assessEnrollment(selectedEnrollmentForAssess.id, formToSubmit);
      
      // 2. Auto-assign section if student has already selected one in their profile
      if (selectedEnrollmentForAssess.section) {
        try {
          // Find the section ID by section code
          const sectionToAssign = sections.find(s => s.section_code === selectedEnrollmentForAssess.section);
          if (sectionToAssign) {
            await registrarService.assignSection(selectedEnrollmentForAssess.id, sectionToAssign.id);
          }
        } catch (sectionErr) {
          console.warn('Could not auto-assign section:', sectionErr);
        }
      }
      
      // 3. Forward to Cashier for review
      await registrarService.approveSubjectAssessment(selectedEnrollmentForAssess.id, {
        ...formToSubmit,
        remarks: assessmentForm.remarks
      });
      setAssessDialogOpen(false);
      alert('Assessment complete. Enrollment forwarded to Cashier for fee review.');
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to complete assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCOR = async (corId: number) => {
    if (!window.confirm('Are you sure you want to approve this COR?')) return;
    try {
      setError('');
      await registrarService.approveCOR(corId);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve COR');
    }
  };

  const handleCorPreview = async (enrollment: any) => {
    try {
      setError('');
      // Set preview with enrollment data (which has student_name)
      // Merge with COR data if available
      setSelectedCorForPreview({
        ...enrollment,
      });
      setCorPreviewOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load COR');
    }
  };

  const handleCorPrint = (enrollment: any) => {
    try {
      setError('');
      // Open print dialog for COR
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        const corContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Certificate of Registration - ${enrollment.first_name ? (enrollment.first_name + ' ' + (enrollment.middle_name ? enrollment.middle_name + ' ' : '') + enrollment.last_name + (enrollment.suffix ? ' ' + enrollment.suffix : '')) : (enrollment.student_name || 'Student')}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .title { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
              .subtitle { font-size: 14px; color: #666; }
              .content { margin-top: 20px; }
              .section { margin-bottom: 20px; }
              .section-title { font-weight: bold; margin-bottom: 10px; font-size: 12px; text-transform: uppercase; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
              .label { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
              th { background-color: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #ddd; }
              td { padding: 8px; border: 1px solid #ddd; }
              .footer { margin-top: 40px; display: flex; justify-content: space-between; }
              .signature { width: 30%; text-align: center; }
              .line { border-top: 1px solid #000; margin-top: 40px; margin-bottom: 5px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">CERTIFICATE OF REGISTRATION</div>
              <div class="subtitle">Academic Year ${enrollment.school_year} - ${enrollment.semester}</div>
            </div>
            <div class="content">
              <div class="section">
                <div class="section-title">Student Information</div>
                <div class="info-row">
                  <span class="label">Name:</span>
                  <span>${enrollment.first_name ? (enrollment.first_name + ' ' + (enrollment.middle_name ? enrollment.middle_name + ' ' : '') + enrollment.last_name + (enrollment.suffix ? ' ' + enrollment.suffix : '')) : (enrollment.student_name || 'N/A')}</span>
                </div>
                <div class="info-row">
                  <span class="label">Student ID:</span>
                  <span>${enrollment.student_id_number || enrollment.student_id || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Course:</span>
                  <span>${enrollment.course || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Year Level:</span>
                  <span>${enrollment.year_level || 'N/A'}</span>
                </div>
              </div>
            </div>
            <div class="footer">
              <div class="signature">
                <div class="line"></div>
                <div>Registrar</div>
              </div>
              <div class="signature">
                <div class="line"></div>
                <div>Dean</div>
              </div>
            </div>
          </body>
          </html>
        `;
        printWindow.document.write(corContent);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to print COR');
    }
  };

  const handleResolveClearance = async (clearanceId: number) => {
    try {
      setError('');
      await registrarService.resolveClearance(clearanceId);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve clearance');
    }
  };

  const handleApproveEnrollment = async () => {
    if (!approvalAction?.enrollment) return;
    try {
      setLoading(true);
      await registrarService.approveEnrollment(approvalAction.enrollment.id, approvalRemarks);
      setApprovalDialogOpen(false);
      setApprovalAction(null);
      setApprovalRemarks('');
      alert(`Enrollment approved for ${approvalAction.enrollment.student}`);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to approve enrollment');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectEnrollment = async () => {
    if (!approvalAction?.enrollment) return;
    try {
      setLoading(true);
      await registrarService.rejectEnrollment(approvalAction.enrollment.id, approvalRemarks);
      setApprovalDialogOpen(false);
      setApprovalAction(null);
      setApprovalRemarks('');
      alert(`Enrollment rejected${approvalRemarks ? ` with remarks: "${approvalRemarks}"` : ''}`);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to reject enrollment');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    // Parse the date - handle both ISO format and SQLite datetime format
    let date: Date;
    
    // Check if it's SQLite datetime format (YYYY-MM-DD HH:MM:SS) vs ISO format
    if (dateString.includes('T')) {
      // ISO format - parse directly
      date = new Date(dateString);
    } else if (dateString.includes(' ')) {
      // SQLite datetime format - treat as UTC
      date = new Date(dateString + 'Z');
    } else {
      // Try parsing as-is
      date = new Date(dateString);
    }
    
    const now = new Date();
    
    // If the date is invalid, return N/A
    if (isNaN(date.getTime())) return 'N/A';
    
    const diffMs = now.getTime() - date.getTime();
    
    // If the difference is negative (future date), show "Just now"
    if (diffMs < 0) return 'Just now';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const openRecord = (student: any) => {
    setSelectedRecord(student);
    // Initialize requirement statuses based on student type
    const requirementStatuses: any = {};
    const studentType = student.student_type || 'New';
    
    if (studentType === 'New' || studentType === 'new') {
      requirementStatuses.form137 = student.form137_status || 'Pending';
      requirementStatuses.form138 = student.form138_status || 'Pending';
      requirementStatuses.birth_certificate = student.birth_certificate_status || 'Pending';
      requirementStatuses.moral_certificate = student.moral_certificate_status || 'Pending';
    } else if (studentType === 'Transferee' || studentType === 'transferee') {
      requirementStatuses.tor = student.tor_status || 'Pending';
      requirementStatuses.certificate_transfer = student.certificate_transfer_status || 'Pending';
      requirementStatuses.birth_certificate = student.birth_certificate_status || 'Pending';
      requirementStatuses.moral_certificate = student.moral_certificate_status || 'Pending';
    } else if (studentType === 'Returning' || studentType === 'returning') {
      requirementStatuses.form137 = student.form137_status || 'Pending';
    }
    
    console.log('Opening student record:', student.student_id, 'Initial form:', requirementStatuses);
    setEditStudentForm(requirementStatuses);
    setViewStudentOpen(true);
  };

  const handleUpdateStudentRecord = async () => {
    if (!selectedRecord) return;
    try {
      setLoading(true);
      console.log('Updating student:', selectedRecord.id, selectedRecord.student_id, 'Form data:', editStudentForm);
      
      // Map requirement field names to their database column names
      const updateData: any = {};
      const studentType = selectedRecord.student_type || 'New';
      
      if (studentType === 'New' || studentType === 'new') {
        updateData.form137_status = editStudentForm.form137 || 'Pending';
        updateData.form138_status = editStudentForm.form138 || 'Pending';
        updateData.birth_certificate_status = editStudentForm.birth_certificate || 'Pending';
        updateData.moral_certificate_status = editStudentForm.moral_certificate || 'Pending';
      } else if (studentType === 'Transferee' || studentType === 'transferee') {
        updateData.tor_status = editStudentForm.tor || 'Pending';
        updateData.certificate_transfer_status = editStudentForm.certificate_transfer || 'Pending';
        updateData.birth_certificate_status = editStudentForm.birth_certificate || 'Pending';
        updateData.moral_certificate_status = editStudentForm.moral_certificate || 'Pending';
      } else if (studentType === 'Returning' || studentType === 'returning') {
        updateData.form137_status = editStudentForm.form137 || 'Pending';
      }
      
      // Add student classification
      if (editStudentForm.student_classification !== undefined) {
        updateData.student_classification = editStudentForm.student_classification;
      }
      
      console.log('Update data to send:', updateData);
      const result = await adminService.updateStudent(selectedRecord.id, updateData);
      console.log('Update result:', result);
      console.log('Update result status:', result?.status || result?.success || result);
      
      if (!result || result.status === 'error' || result.success === false) {
        throw new Error(result?.message || 'Update failed on server');
      }
      
      alert('Requirement statuses updated successfully');
      setViewStudentOpen(false);
      
      // Refresh the data
      console.log('Fetching fresh data...');
      await fetchData();
      console.log('Data fetched');
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update requirements');
      alert('Error: ' + (err.message || 'Failed to update requirements'));
    } finally {
      setLoading(false);
    }
  };

  const stats = dashboardStats ? [
    { 
      label: 'Total Records', 
      value: dashboardStats.totalRecords?.toString() || '0', 
      icon: FileText, 
      color: 'from-blue-500 to-blue-600',
      change: ''
    },
    { 
      label: 'Pending Grades', 
      value: dashboardStats.pendingGrades?.toString() || '0', 
      icon: ClipboardCheck, 
      color: 'from-orange-500 to-orange-600',
      change: ''
    },
    { 
      label: 'COR Requests', 
      value: dashboardStats.corRequests?.toString() || '0', 
      icon: Award, 
      color: 'from-green-500 to-green-600',
      change: ''
    },
    { 
      label: 'Clearances', 
      value: dashboardStats.clearances?.toString() || '0', 
      icon: CheckCircle, 
      color: 'from-purple-500 to-purple-600',
      change: ''
    },
  ] : [];

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="p-6 border-0 shadow-lg hover:shadow-xl transition-all bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  {stat.change && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0">
                      {stat.change}
                    </Badge>
                  )}
                </div>
                <h3 className="text-3xl mb-1">{stat.value}</h3>
                <p className="text-sm text-slate-600">{stat.label}</p>
              </Card>
            );
          })}
        </div>

        {/* Enrollment Analytics */}
        {enrollmentReport && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="border-0 shadow-lg">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-slate-900">Enrollment Totals</h3>
                <p className="text-sm text-slate-500">Per semester and pending pipeline</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                  <span className="text-sm text-slate-600">Pending Enrollments</span>
                  <span className="font-semibold text-orange-600">{enrollmentReport.pending}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 mb-2">Per Semester</p>
                  <div className="space-y-1">
                    {enrollmentReport.perSemester?.map((row: any) => (
                      <div key={row.period} className="flex justify-between text-sm">
                        <span className="text-slate-600">{row.period}</span>
                        <span className="font-semibold">{row.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-lg">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-slate-900">Students per Section</h3>
                <p className="text-sm text-slate-500">Helps balance assignments</p>
              </div>
              <div className="p-4 space-y-2 max-h-[320px] overflow-y-auto">
                {enrollmentReport.perSection?.map((row: any) => (
                  <div key={`${row.section_code}-${row.section_name}`} className="flex justify-between text-sm border-b py-1">
                    <span className="text-slate-600">{row.section_code} • {row.section_name}</span>
                    <span className="font-semibold">{row.total}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent COR Requests */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
              <h3 className="text-white">Recent COR Requests</h3>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="p-4">
                {corRequests.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No COR requests</p>
                ) : (
                  <div className="space-y-3">
                    {corRequests.map((request) => (
                      <div key={request.id} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm text-slate-900">{request.student_name}</p>
                            <p className="text-xs text-slate-500">{request.student_id} • {request.course}{request.section ? ` • Sec ${request.section}` : ''}</p>
                          </div>
                          <Badge className={request.status === 'Approved' || request.status === 'Generated' ? 'bg-green-100 text-green-700 border-0 text-xs' : 'bg-orange-100 text-orange-700 border-0 text-xs'}>
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">{request.semester}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(request.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Clearance Requests */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h3 className="text-white">Pending Clearances</h3>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="p-4">
                {clearanceRequests.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No pending clearances</p>
                ) : (
                  <div className="space-y-3">
                    {clearanceRequests.map((clearance) => (
                      <div key={clearance.id} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm text-slate-900">{clearance.student_name}</p>
                            <p className="text-xs text-slate-500">{clearance.student_id}</p>
                            <p className="text-xs text-slate-600 mt-1">{clearance.clearance_type}</p>
                            {clearance.issue_description && (
                              <p className="text-xs text-orange-600 mt-1">{clearance.issue_description}</p>
                            )}
                          </div>
                          <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                            {clearance.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(clearance.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </>
    );
  };

  const renderStudentRecordsContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    const filteredRecords = studentRecords.filter((student) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        student.student_id?.toLowerCase().includes(search) ||
        student.first_name?.toLowerCase().includes(search) ||
        student.last_name?.toLowerCase().includes(search) ||
        student.course?.toLowerCase().includes(search)
      );
    });

    return (
      <div>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search student records..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={() => setActiveSection('Subject Management')} className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <BookOpen className="h-4 w-4 mr-2" />
            Modify Subjects
          </Button>
        </div>
        <Card className="border-0 shadow-lg">
          <div className="p-6">
            {filteredRecords.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No student records found</p>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((student) => (
                  <div key={student.id} className="p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-slate-900">{student.first_name} {student.last_name}</h4>
                        <p className="text-sm text-slate-500">{student.student_id} • {student.course} • Year {student.year_level}{student.section ? ` • Section ${student.section}` : ''}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge className={student.clearance_status === 'Clear' ? 'bg-green-100 text-green-700 border-0' : 'bg-orange-100 text-orange-700 border-0'}>
                            {student.clearance_status || 'Clear'}
                          </Badge>
                          <Badge variant="secondary">{student.status || 'Active'}</Badge>
                          <Badge className={student.student_classification === 'Irregular' ? 'bg-amber-100 text-amber-700 border-0' : 'bg-blue-100 text-blue-700 border-0'}>
                            {student.student_classification || 'Regular'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openRecord(student)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View / Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderGradesManagementContent = () => (
    <div>
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending Submissions</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="finalized">Finalized</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-6">
              {gradeSubmissions.filter(g => g.status === 'Pending').length === 0 ? (
                <p className="text-center text-slate-500 py-8">No pending grade submissions</p>
              ) : (
                <div className="space-y-4">
                  {gradeSubmissions.filter(g => g.status === 'Pending').map((student) => (
                    <div key={student.student_name} className="border border-red-200 bg-red-50 rounded-xl overflow-hidden">
                      <div className="p-4 border-b border-red-200 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{student.student_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{student.course} • Year {student.year_level} • {student.school_year} • {student.semester} Sem</p>
                        </div>
                        <Badge className="bg-red-100 text-red-700 border-0">Pending</Badge>
                      </div>
                      <div className="divide-y divide-red-100">
                        {student.subjects.map((s: any, idx: number) => (
                          <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{s.subject_code} — {s.subject_name}</p>
                              <p className="text-xs text-slate-500">{s.units} units</p>
                            </div>
                            <span className="text-sm font-bold text-indigo-600">{s.grade}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="submitted" className="mt-6">
              {gradeSubmissions.filter(g => g.status === 'Submitted').length === 0 ? (
                <p className="text-center text-slate-500 py-8">No submitted grades pending approval</p>
              ) : (
                <div className="space-y-4">
                  {gradeSubmissions.filter(g => g.status === 'Submitted').map((student) => (
                    <div key={student.student_name} className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                      <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50 border-b flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{student.student_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{student.course} • Year {student.year_level} • {student.school_year} • {student.semester} Sem</p>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          {student.subjects.length} {student.subjects.length === 1 ? 'subject' : 'subjects'} • Awaiting Dean Approval
                        </Badge>
                      </div>
                      <div className="px-4 py-2 bg-slate-50 border-b flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <span>Subject</span>
                        <span className="w-12 text-center">Grade</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {student.subjects.map((s: any, idx: number) => (
                          <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{s.subject_code} — {s.subject_name}</p>
                              <p className="text-xs text-slate-500">{s.units} units</p>
                            </div>
                            <span className="text-sm font-bold text-indigo-600 w-12 text-center">{s.grade}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="finalized" className="mt-6">
              {gradeSubmissions.filter(g => g.status === 'Approved').length === 0 ? (
                <p className="text-center text-slate-500 py-8">No finalized grades for this period</p>
              ) : (
                <div className="space-y-4">
                  {gradeSubmissions.filter(g => g.status === 'Approved').map((student) => (
                    <div key={student.student_name} className="border border-green-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{student.student_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{student.course} • Year {student.year_level} • {student.school_year} • {student.semester} Sem</p>
                          {student.approved_by && (
                            <p className="text-xs text-green-600 mt-1">Approved by: {student.approved_by}</p>
                          )}
                        </div>
                        <Badge className="bg-green-100 text-green-800 border-0">
                          {student.subjects.length} {student.subjects.length === 1 ? 'subject' : 'subjects'} • Finalized
                        </Badge>
                      </div>
                      <div className="px-4 py-2 bg-slate-50 border-b flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <span>Subject</span>
                        <span className="w-12 text-center">Grade</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {student.subjects.map((s: any, idx: number) => (
                          <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{s.subject_code} — {s.subject_name}</p>
                              <p className="text-xs text-slate-500">{s.units} units</p>
                            </div>
                            <span className="text-sm font-bold text-green-700 w-12 text-center">{s.grade}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );

  // Helper to build full name from separate fields
  const getFullName = (s: any) => {
    if (s.student_name) return s.student_name;
    const parts = [s.first_name, s.middle_name, s.last_name, s.suffix].filter(Boolean);
    return parts.join(' ') || 'Unknown';
  };

  const getStudentDisplayId = (s: any) => {
    return s.student_id_number || s.student_id || 'N/A';
  };

  const renderCORManagementContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    // Filter and sort students by name based on search term
    const filteredStudents = corRequests
      .filter((student) => {
        const fullName = getFullName(student).toLowerCase();
        const displayId = String(getStudentDisplayId(student)).toLowerCase();
        const term = corSearchTerm.toLowerCase();
        return fullName.includes(term) || displayId.includes(term);
      })
      .sort((a, b) => getFullName(a).localeCompare(getFullName(b)));

    // Group by first letter of student name
    const groupedByLetter = filteredStudents.reduce((acc, student) => {
      const firstLetter = getFullName(student).charAt(0).toUpperCase();
      if (!acc[firstLetter]) {
        acc[firstLetter] = [];
      }
      acc[firstLetter].push(student);
      return acc;
    }, {} as Record<string, any[]>);

    const sortedLetters = Object.keys(groupedByLetter).sort();

    return (
      <div>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </div>
        )}
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={corSearchTerm}
              onChange={(e) => setCorSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <div className="p-12 text-center">
              <p className="text-slate-500 text-lg">No enrolled students found</p>
              {corSearchTerm && (
                <p className="text-slate-400 text-sm mt-2">Try adjusting your search terms</p>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedLetters.map((letter) => (
              <div key={letter}>
                {/* Letter Header */}
                <div className="mb-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {letter}
                  </div>
                  <h3 className="text-slate-700 font-semibold">
                    {groupedByLetter[letter].length} {groupedByLetter[letter].length === 1 ? 'student' : 'students'}
                  </h3>
                </div>

                {/* Students in this letter group */}
                <div className="space-y-3 ml-11">
                  {groupedByLetter[letter].map((student) => (
                    <Card key={student.enrollment_id} className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-all">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-slate-900 font-semibold">{getFullName(student)}</h4>
                            <p className="text-sm text-slate-500 mt-1">
                              ID: {getStudentDisplayId(student)} • {student.course}
                            </p>
                            <p className="text-sm text-slate-600 mt-1">
                              Year {student.year_level} • {student.school_year} • {student.semester} Semester
                              {student.section && ` • Section ${student.section}`}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-0 h-fit">
                            Enrolled
                          </Badge>
                        </div>
                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                          <button
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.875rem',
                              border: '1px solid #e2e8f0',
                              borderRadius: '0.375rem',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              cursor: 'pointer',
                              opacity: 1,
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f1f5f9';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                            onClick={() => handleCorPreview(student)}
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </button>
                          <button
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.875rem',
                              border: 'none',
                              borderRadius: '0.375rem',
                              background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
                              color: '#ffffff',
                              cursor: 'pointer',
                              opacity: 1,
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(to right, #1d4ed8, #1e40af)';
                              e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(to right, #2563eb, #1d4ed8)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                            onClick={() => handleCorPrint(student)}
                          >
                            <Printer className="h-4 w-4" />
                            Print
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* COR Preview Modal */}
        {corPreviewOpen && selectedCorForPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Certificate of Registration
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {getFullName(selectedCorForPreview)}
                    </p>
                  </div>
                  <button
                    onClick={() => setCorPreviewOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="border-b border-slate-200 pb-6 mb-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-slate-900">
                      CERTIFICATE OF REGISTRATION
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Academic Year {selectedCorForPreview.school_year} - {selectedCorForPreview.semester} Semester
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Student Name</p>
                      <p className="text-sm text-slate-900 font-medium mt-1">
                        {getFullName(selectedCorForPreview)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Student ID</p>
                      <p className="text-sm text-slate-900 font-medium mt-1">
                        {getStudentDisplayId(selectedCorForPreview)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Course</p>
                      <p className="text-sm text-slate-900 font-medium mt-1">
                        {selectedCorForPreview.course}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Year Level</p>
                      <p className="text-sm text-slate-900 font-medium mt-1">
                        Year {selectedCorForPreview.year_level}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-slate-200">
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      cursor: 'pointer',
                      opacity: 1,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                    onClick={() => setCorPreviewOpen(false)}
                  >
                    Close
                  </button>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      border: 'none',
                      borderRadius: '0.375rem',
                      background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      opacity: 1,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #1d4ed8, #1e40af)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #2563eb, #1d4ed8)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => {
                      handleCorPrint(selectedCorForPreview);
                      setCorPreviewOpen(false);
                    }}
                  >
                    <Printer className="h-4 w-4" />
                    Print COR
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const renderClearanceContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    return (
      <div>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </div>
        )}
        <Card className="border-0 shadow-lg">
          <div className="p-6">
            <p className="text-slate-600 mb-6">Manage student clearances and requirements.</p>
            {clearanceRequests.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No clearance requests found</p>
            ) : (
              <div className="space-y-4">
                {clearanceRequests.map((clearance) => (
                  <div key={clearance.id} className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-slate-900">{clearance.student_name}</h4>
                        <p className="text-sm text-slate-500">ID: {clearance.id} • {clearance.student_id}</p>
                        <div className="mt-2">
                          <Badge variant="secondary">{clearance.clearance_type}</Badge>
                        </div>
                        {clearance.issue_description && (
                          <p className="text-sm text-orange-700 mt-2">Issue: {clearance.issue_description}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(clearance.created_at)}</p>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700 border-0">
                        {clearance.status}
                      </Badge>
                    </div>
                    {clearance.status === 'Pending' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-green-600 to-green-700"
                          onClick={() => handleResolveClearance(clearance.id)}
                        >
                          Mark Resolved
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderPendingEnrollmentsContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    return (
      <div>
        <Card className="border-0 shadow-lg">
          <div className="p-6">
            {pendingEnrollments.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No pending enrollments</p>
            ) : (
              <div className="space-y-4">
                {pendingEnrollments.map((e) => (
                  <div key={e.id} className="p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-slate-900">{e.first_name} {e.last_name}</h4>
                        <p className="text-sm text-slate-500">Enrollment #{e.id} • {e.school_year} • {e.semester}{e.section ? ` • Section ${e.section}` : ''}</p>
                        <p className="text-sm text-slate-600 mt-2">Status: {e.status}</p>
                        {e.section && (
                          <p className="text-sm text-emerald-700 font-medium mt-1">
                            ✓ Section: {e.section}
                          </p>
                        )}
                        {e.status === 'For Admin Approval' && e.total_amount && (
                          <p className="text-sm text-green-700 font-medium mt-1">
                            Assessment: ₱{e.total_amount?.toLocaleString() || '0.00'}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {e.status === 'For Admin Approval' ? 'Assessed' : 'Submitted'} {formatTimeAgo(e.assessed_at || e.created_at)}
                        </p>
                        
                        {/* Show documents if any */}
                        {e.documents && e.documents.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-medium text-slate-700 mb-1">Documents:</p>
                            <div className="flex flex-wrap gap-1">
                              {e.documents.map((doc: any, idx: number) => (
                                <a 
                                  key={idx}
                                  href={doc.file_path}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >
                                  {doc.document_type || `Doc ${idx + 1}`}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <Badge className={e.status === 'For Admin Approval' ? 'bg-yellow-100 text-yellow-700 border-0 text-xs' : 'bg-orange-100 text-orange-700 border-0 text-xs'}>
                        {e.status}
                      </Badge>
                    </div>
                    
                    {/* Action buttons based on status */}
                    {e.status === 'Pending Assessment' && (
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={async () => {
                            setPreviewEnrollment(e);
                            try {
                              const docsResp = await adminService.getEnrollmentDocuments(e.id);
                              if (docsResp.success) {
                                setPreviewEnrollment({ ...e, documents: docsResp.data });
                              }
                            } catch (err) {
                              console.error('Error fetching documents:', err);
                            }
                            setPreviewDocumentsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Documents
                        </Button>
                        <Button size="sm" className="bg-gradient-to-r from-green-600 to-green-700" onClick={() => openAssessDialog(e)}>
                          Assess
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 border-red-200"
                          onClick={() => {
                            setApprovalAction({ type: 'reject', enrollment: e });
                            setApprovalDialogOpen(true);
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    
                    {e.status === 'For Admin Approval' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-green-600 to-green-700"
                          onClick={() => {
                            setApprovalAction({ type: 'approve', enrollment: e });
                            setApprovalDialogOpen(true);
                          }}
                        >
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // ─── Subject Management (Adding / Dropping) ─────────────────────────
  const smSearchStudents = async (searchVal?: string) => {
    try {
      setSmLoading(true);
      const resp = await registrarService.searchEnrolledStudents(searchVal ?? smSearch, smStatusFilter);
      setSmStudents(resp?.data || []);
    } catch (err) {
      console.error('Search enrolled students error:', err);
      setSmStudents([]);
    } finally {
      setSmLoading(false);
    }
  };

  const smLoadEnrollmentSubjects = async (enrollmentId: number) => {
    try {
      setSmLoading(true);
      const resp = await registrarService.getEnrollmentSubjectsForEdit(enrollmentId);
      const d = resp?.data || resp;
      setSmEnrolledSubjects(d.enrolledSubjects || []);
      setSmAvailableSubjects(d.availableSubjects || []);
      setSmEnrollmentData(d.enrollment || null);
      // Also load audit trail
      const auditResp = await registrarService.getSubjectAuditTrail(enrollmentId);
      setSmAuditTrail(auditResp?.data || []);
    } catch (err) {
      console.error('Load enrollment subjects error:', err);
    } finally {
      setSmLoading(false);
    }
  };

  const smHandleAddSubject = async (subjectId: number) => {
    if (!smSelectedEnrollment) return;
    try {
      setSmLoading(true);
      await registrarService.registrarAddSubject(smSelectedEnrollment.enrollment_id, subjectId, smReason || undefined);
      setSmReason('');
      await smLoadEnrollmentSubjects(smSelectedEnrollment.enrollment_id);
    } catch (err: any) {
      console.error('Add subject error:', err);
      alert(err.message || 'Failed to add subject');
    } finally {
      setSmLoading(false);
    }
  };

  const smHandleDropSubject = async (subjectId: number) => {
    if (!smSelectedEnrollment) return;
    try {
      setSmLoading(true);
      await registrarService.registrarDropSubject(smSelectedEnrollment.enrollment_id, subjectId, smReason || undefined);
      setSmReason('');
      await smLoadEnrollmentSubjects(smSelectedEnrollment.enrollment_id);
    } catch (err: any) {
      console.error('Drop subject error:', err);
      alert(err.message || 'Failed to drop subject');
    } finally {
      setSmLoading(false);
    }
  };

  const renderSubjectManagementContent = () => {
    const enrolledIds = new Set(smEnrolledSubjects.map((s: any) => s.subject_id));
    const notEnrolled = smAvailableSubjects.filter((s: any) => !enrolledIds.has(s.id));

    return (
      <div className="space-y-4 -mx-4">
        {/* Search Bar */}
        <Card className="p-4 mx-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by student name or ID..."
                value={smSearch}
                onChange={(e) => setSmSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && smSearchStudents()}
                className="pl-10"
              />
            </div>
            <Select value={smStatusFilter} onValueChange={(v) => setSmStatusFilter(v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Enrolled">Enrolled</SelectItem>
                <SelectItem value="For Payment">For Payment</SelectItem>
                <SelectItem value="Pending Assessment">Pending Assessment</SelectItem>
                <SelectItem value="For Registrar Assessment">For Registrar Assessment</SelectItem>
                <SelectItem value="Cashier Review">Cashier Review</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => smSearchStudents()} disabled={smLoading}>
              {smLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Search</span>
            </Button>
          </div>
        </Card>

        {/* Two-Column Layout: Left = Student List, Right = Subject Editor */}
        <div className="flex gap-4 px-4" style={{ minHeight: '620px' }}>
          {/* Student List */}
          <div className="w-[340px] shrink-0">
            <Card className="p-0 overflow-hidden h-full">
              <div className="px-4 py-3 bg-slate-50 border-b">
                <h3 className="text-sm font-semibold text-slate-700">
                  Students list {smStudents.length > 0 && <span className="text-slate-400 font-normal">({smStudents.length})</span>}
                </h3>
              </div>
              <ScrollArea className="h-[580px]">
                {smStudents.length === 0 ? (
                  <div className="p-8 text-center">
                    <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">{smLoading ? 'Loading students...' : 'No student enrollments found'}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {smStudents.map((stu: any) => (
                      <button
                        key={stu.enrollment_id}
                        onClick={() => {
                          setSmSelectedEnrollment(stu);
                          smLoadEnrollmentSubjects(stu.enrollment_id);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${
                          smSelectedEnrollment?.enrollment_id === stu.enrollment_id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {stu.first_name} {stu.last_name} {stu.suffix || ''}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{stu.student_id_number} · {stu.course} Year {stu.year_level}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={
                            stu.enrollment_status === 'Enrolled' ? 'bg-green-100 text-green-700 border-0 text-[10px]' :
                            stu.enrollment_status === 'For Payment' ? 'bg-amber-100 text-amber-700 border-0 text-[10px]' :
                            'bg-blue-100 text-blue-700 border-0 text-[10px]'
                          }>
                            {stu.enrollment_status}
                          </Badge>
                          <span className="text-[10px] text-slate-400">{stu.school_year} · {stu.semester}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>

          {/* Subject Editor + Audit */}
          <div className="flex-1 min-w-0 space-y-4">
            {!smSelectedEnrollment ? (
              <Card className="p-12 text-center">
                <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Select a student enrollment to manage subjects</p>
                <p className="text-sm text-slate-400 mt-1">Search and click on a student from the left panel</p>
              </Card>
            ) : (
              <>
                {/* Student Info Header */}
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {smSelectedEnrollment.first_name} {smSelectedEnrollment.last_name} {smSelectedEnrollment.suffix || ''}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {smSelectedEnrollment.student_id_number} · {smSelectedEnrollment.course} · Year {smSelectedEnrollment.year_level}
                        {smSelectedEnrollment.student_classification === 'Irregular' && (
                          <Badge className="ml-2 bg-amber-100 text-amber-700 border-0 text-[10px]">Irregular</Badge>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">
                        Units: <span className="font-bold text-slate-800">{smEnrollmentData?.total_units || 0}</span>
                        {' · '}
                        Total: <span className="font-bold text-indigo-600">₱{(smEnrollmentData?.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </p>
                      <Badge className={
                        smSelectedEnrollment.enrollment_status === 'Enrolled' ? 'bg-green-100 text-green-700 border-0' :
                        'bg-blue-100 text-blue-700 border-0'
                      }>
                        {smSelectedEnrollment.enrollment_status}
                      </Badge>
                    </div>
                  </div>
                </Card>

                {/* Reason Input */}
                <Card className="p-4">
                  <Label className="text-xs text-slate-500 mb-1 block">Reason for change (optional — recorded in audit trail)</Label>
                  <Input
                    placeholder="e.g., Schedule conflict, student request, prerequisite not met..."
                    value={smReason}
                    onChange={(e) => setSmReason(e.target.value)}
                  />
                </Card>

                <Tabs defaultValue="enrolled">
                  <TabsList>
                    <TabsTrigger value="enrolled">Enrolled Subjects ({smEnrolledSubjects.length})</TabsTrigger>
                    <TabsTrigger value="available">Available to Add ({notEnrolled.length})</TabsTrigger>
                    <TabsTrigger value="audit">Audit Trail ({smAuditTrail.length})</TabsTrigger>
                  </TabsList>

                  {/* Enrolled Subjects */}
                  <TabsContent value="enrolled">
                    <Card className="p-0 overflow-hidden">
                      {smLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                      ) : smEnrolledSubjects.length === 0 ? (
                        <div className="p-8 text-center">
                          <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">No subjects enrolled yet</p>
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Code</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Subject Name</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Units</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Year</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Semester</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Status</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {smEnrolledSubjects.map((s: any) => (
                              <tr key={s.id} className="hover:bg-red-50/30 transition-colors">
                                <td className="px-4 py-3 font-mono font-semibold text-slate-800">{s.subject_code}</td>
                                <td className="px-4 py-3 text-slate-700">{s.subject_name}</td>
                                <td className="px-4 py-3 text-center">{s.units}</td>
                                <td className="px-4 py-3 text-center">{s.year_level || '-'}</td>
                                <td className="px-4 py-3 text-center">{s.semester || '-'}</td>
                                <td className="px-4 py-3 text-center">
                                  <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">{s.es_status}</Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => smHandleDropSubject(s.subject_id)}
                                    disabled={smLoading}
                                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-7 text-xs"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Drop
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50">
                            <tr>
                              <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-slate-700">Total</td>
                              <td className="px-4 py-3 text-center font-bold text-slate-800">
                                {smEnrolledSubjects.reduce((sum: number, s: any) => sum + (s.units || 0), 0)}
                              </td>
                              <td colSpan={4}></td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </Card>
                  </TabsContent>

                  {/* Available Subjects to Add */}
                  <TabsContent value="available">
                    <Card className="p-0 overflow-hidden">
                      {smLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                      ) : notEnrolled.length === 0 ? (
                        <div className="p-8 text-center">
                          <CheckCircle className="h-8 w-8 text-green-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">All available subjects are already enrolled</p>
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Code</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Subject Name</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Units</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Year</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Semester</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {notEnrolled.map((s: any) => (
                              <tr key={s.id} className="hover:bg-green-50/30 transition-colors">
                                <td className="px-4 py-3 font-mono font-semibold text-slate-600">{s.subject_code}</td>
                                <td className="px-4 py-3 text-slate-600">{s.subject_name}</td>
                                <td className="px-4 py-3 text-center">{s.units}</td>
                                <td className="px-4 py-3 text-center">{s.year_level || '-'}</td>
                                <td className="px-4 py-3 text-center">{s.semester || '-'}</td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => smHandleAddSubject(s.id)}
                                    disabled={smLoading}
                                    className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 h-7 text-xs"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </Card>
                  </TabsContent>

                  {/* Audit Trail */}
                  <TabsContent value="audit">
                    <Card className="p-0 overflow-hidden">
                      {smAuditTrail.length === 0 ? (
                        <div className="p-8 text-center">
                          <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">No changes recorded yet</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {smAuditTrail.map((entry: any) => (
                            <div key={entry.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                                    entry.action === 'ADD' || entry.action === 'REPLACE_ADD'
                                      ? 'bg-green-100 text-green-600'
                                      : 'bg-red-100 text-red-600'
                                  }`}>
                                    {entry.action === 'ADD' || entry.action === 'REPLACE_ADD' ? (
                                      <Plus className="h-3.5 w-3.5" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">
                                      <span className={entry.action === 'ADD' || entry.action === 'REPLACE_ADD' ? 'text-green-700' : 'text-red-700'}>
                                        {entry.action === 'ADD' ? 'Added' : entry.action === 'DROP' ? 'Dropped' : entry.action === 'REPLACE_ADD' ? 'Replaced (Added)' : 'Replaced (Removed)'}
                                      </span>
                                      {' '}<span className="font-mono">{entry.subject_code}</span> — {entry.subject_name} ({entry.units}u)
                                    </p>
                                    {entry.reason && (
                                      <p className="text-xs text-slate-500 mt-0.5">Reason: {entry.reason}</p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Units: {entry.old_total_units} → {entry.new_total_units} · Total: ₱{(entry.old_total_amount || 0).toLocaleString()} → ₱{(entry.new_total_amount || 0).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 ml-4">
                                  <p className="text-xs text-slate-500">{entry.performed_by_name}</p>
                                  <p className="text-[10px] text-slate-400">{new Date(entry.created_at + 'Z').toLocaleString('en-US', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit', 
                                    hour: '2-digit', 
                                    minute: '2-digit', 
                                    second: '2-digit',
                                    hour12: true
                                  })}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className="w-72 bg-white border-r border-slate-200 shadow-xl flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-slate-900">IC Northgate</h3>
                <p className="text-sm text-slate-500">Registrar Portal</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <button
              onClick={() => setActiveSection('Dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Dashboard' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveSection('Pending Enrollments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Pending Enrollments' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText className="h-5 w-5" />
              Pending Enrollments
            </button>

            <button
              onClick={() => setActiveSection('Student Records')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Student Records' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="h-5 w-5" />
              Student Records
            </button>

            <button
              onClick={() => setActiveSection('Grades Management')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Grades Management' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ClipboardCheck className="h-5 w-5" />
              Grades Management
            </button>

            <button
              onClick={() => setActiveSection('COR Management')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'COR Management' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Award className="h-5 w-5" />
              COR Management
            </button>

            <button
              onClick={() => setActiveSection('Clearances')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Clearances' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <CheckCircle className="h-5 w-5" />
              Clearances
            </button>
          </nav>

          <div className="p-4 border-t border-slate-200">
            <Button 
              variant="outline" 
              className="w-full justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl mb-1">
                  {activeSection === 'Dashboard' && 'Registrar Dashboard'}
                  {activeSection === 'Pending Enrollments' && 'Pending Enrollments'}
                  {activeSection === 'Student Records' && 'Student Records'}
                  {activeSection === 'Grades Management' && 'Grades Management'}
                  {activeSection === 'COR Management' && 'COR Management'}
                  {activeSection === 'Clearances' && 'Clearances'}
                  {activeSection === 'Subject Management' && 'Modifying of Subjects'}
                </h1>
                <p className="text-sm text-slate-600">
                  {activeSection === 'Dashboard' && 'Student records and academic documentation'}
                  {activeSection === 'Pending Enrollments' && 'Review and assess pending student enrollments'}
                  {activeSection === 'Student Records' && 'View and manage student documentation requirements'}
                  {activeSection === 'Grades Management' && 'Track faculty grade submissions and finalize grades'}
                  {activeSection === 'COR Management' && 'Generate and manage Certification of Registration'}
                  {activeSection === 'Clearances' && 'Resolve student clearance issues and requirements'}
                  {activeSection === 'Subject Management' && 'Modify subjects of students with full audit trail'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-slate-600">Registrar User</p>
                  <p className="text-xs text-slate-500">registrar@icnorthgate.edu</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {/* Dynamic Content */}
            {activeSection === 'Dashboard' && renderDashboardContent()}
            {activeSection === 'Student Records' && renderStudentRecordsContent()}
            {activeSection === 'Grades Management' && renderGradesManagementContent()}
            {activeSection === 'COR Management' && renderCORManagementContent()}
            {activeSection === 'Clearances' && renderClearanceContent()}
            {activeSection === 'Pending Enrollments' && renderPendingEnrollmentsContent()}
            {activeSection === 'Subject Management' && renderSubjectManagementContent()}
          </div>
        </div>
      </div>
      
      {/* Assessment Dialog */}
      <Dialog open={assessDialogOpen} onOpenChange={setAssessDialogOpen}>
        <DialogContent className="max-w-6xl sm:max-w-6xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enrollment Assessment</DialogTitle>
            <DialogDescription>
              {selectedEnrollmentForAssess?.first_name} {selectedEnrollmentForAssess?.last_name} — {selectedEnrollmentForAssess?.course} Year {selectedEnrollmentForAssess?.year_level}{selectedEnrollmentForAssess?.section ? ` • Section ${selectedEnrollmentForAssess.section}` : ''} • {selectedEnrollmentForAssess?.school_year} {selectedEnrollmentForAssess?.semester}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6">
            {/* LEFT: Subject Assignment */}
            <div className="space-y-4 border-r pr-6 flex flex-col">
              {/* ── Enrolled subjects (top) ── */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                    <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Enrolled Subjects
                  </h4>
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                  {!!subjectAssessmentDetails?.subjects?.length && (
                    <span className="text-xs text-slate-400 font-medium">
                      {subjectAssessmentDetails.subjects.reduce((sum: number, s: any) => sum + (s.units || 0), 0)} units
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-0.5">
                  {!subjectAssessmentDetails?.subjects?.length ? (
                    <div className="p-4 border border-dashed rounded-lg text-center bg-slate-50">
                      <p className="text-xs text-slate-400">No subjects enrolled yet</p>
                    </div>
                  ) : (
                    subjectAssessmentDetails.subjects.map((s: any) => (
                      <div key={s.id} className="group flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 bg-white hover:border-red-200 hover:bg-red-50/30 transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{s.subject_code}</p>
                          <p className="text-[11px] text-slate-500 truncate">{s.subject_name} · {s.units}u</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── Removed subjects (bottom) ── */}
              {(() => {
                const enrolledIds = new Set((subjectAssessmentDetails?.subjects || []).map((s: any) => s.subject_id));
                const removed = availableSubjects.filter((s: any) => !enrolledIds.has(s.id));
                if (removed.length === 0) return null;
                return (
                  <div className="pt-3 border-t">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Removed — click to add back</h4>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-0.5">
                      {removed.map((s: any) => (
                        <div key={s.id} className="group flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-500 truncate">{s.subject_code}</p>
                            <p className="text-[11px] text-slate-400 truncate">{s.subject_name} · {s.units}u</p>
                          </div>
                          <button
                            disabled={loading}
                            onClick={() => handleAddSubjectToEnrollment(s.id)}
                            className="ml-2 shrink-0 p-1 rounded text-slate-300 hover:text-indigo-600 hover:bg-indigo-100 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* RIGHT: Scholarship + Fees */}
            <div className="space-y-4">
              {selectedEnrollmentForAssess?.scholarship_type && selectedEnrollmentForAssess.scholarship_type !== 'None' && (
                <div className="p-4 bg-slate-100/50 border border-slate-200 rounded-xl">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-indigo-700">
                      <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <h4 className="font-bold text-sm">Scholarship: {selectedEnrollmentForAssess.scholarship_type}</h4>
                    </div>
                    {selectedEnrollmentForAssess.scholarship_letter_path && (
                      <button onClick={() => handleDownloadScholarship(selectedEnrollmentForAssess.scholarship_letter_path)}
                        className="text-xs text-blue-600 flex items-center gap-1 bg-white px-2 py-1 rounded border shadow-sm hover:bg-slate-50">
                        <Download className="h-3 w-3" /> Letter
                      </button>
                    )}
                  </div>
                  <Label className="text-slate-500 text-xs font-medium mb-2 block">Select Coverage</Label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(SCHOLARSHIP_DEFINITIONS[selectedEnrollmentForAssess.scholarship_type]?.coverage || []).map((c: string) => (
                      <button key={c} type="button"
                        onClick={() => setAssessmentForm({ ...assessmentForm, scholarship_coverage: c })}
                        className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all border-2 ${
                          assessmentForm.scholarship_coverage === c
                            ? 'bg-indigo-100 text-slate-900 border-indigo-500 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}>{c}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tuition</Label>
                  <Input type="number" value={assessmentForm.tuition} disabled className="bg-slate-100" />
                </div>
                <div><Label className="text-xs">Registration</Label>
                  <Input type="number" value={assessmentForm.registration} disabled className="bg-slate-100" />
                </div>
                <div><Label className="text-xs">Library</Label>
                  <Input type="number" value={assessmentForm.library} disabled className="bg-slate-100" />
                </div>
                <div><Label className="text-xs">Lab</Label>
                  <Input type="number" value={assessmentForm.lab} disabled className="bg-slate-100" />
                </div>
                <div><Label className="text-xs">ID Fee</Label>
                  <Input type="number" value={assessmentForm.id_fee} disabled className="bg-slate-100" />
                </div>
                <div><Label className="text-xs">Others</Label>
                  <Input type="number" value={assessmentForm.others} disabled className="bg-slate-100" />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-2">
                {(() => {
                  const totalUnits = subjectAssessmentDetails?.subjects?.reduce((sum: number, s: any) => sum + (s.units || 0), 0) || 0;
                  const perUnit = totalUnits > 0 ? Math.round(assessmentForm.tuition / totalUnits) : 0;
                  return totalUnits > 0 ? (
                    <div className="flex justify-between text-slate-600">
                      <span>Tuition ({totalUnits} units × ₱{perUnit.toLocaleString()}/unit):</span>
                      <span>₱{assessmentForm.tuition.toLocaleString()}.00</span>
                    </div>
                  ) : null;
                })()}
                {assessmentForm.scholarship_coverage && (
                  <div className="flex justify-between text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Scholarship Deduction:</span>
                    <span>- ₱{getTuitionDeduction(assessmentForm.scholarship_coverage, assessmentForm.tuition).toLocaleString()}.00</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Misc Fees:</span>
                  <span>₱{(assessmentForm.registration + assessmentForm.library + assessmentForm.lab + assessmentForm.id_fee + assessmentForm.others).toLocaleString()}.00</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex justify-between font-bold text-slate-900 pt-1">
                  <span className="text-base">Total Assessment:</span>
                  <span className="text-2xl text-indigo-600 font-mono">
                    ₱{(assessmentForm.tuition - getTuitionDeduction(assessmentForm.scholarship_coverage, assessmentForm.tuition) + assessmentForm.registration + assessmentForm.library + assessmentForm.lab + assessmentForm.id_fee + assessmentForm.others).toLocaleString()}.00
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setAssessDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAssessEnrollment} disabled={loading || !subjectAssessmentDetails?.subjects?.length}
                  className="">
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Complete & Forward to Cashier
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subject Assessment is now merged into the Enrollment Assessment dialog */}

      {/* Assign Section Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Section</DialogTitle>
            <DialogDescription>Select a section for this enrollment</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Section</Label>
              <Select
                value={assignForm.sectionId}
                onValueChange={(v) => setAssignForm((prev) => ({ ...prev, sectionId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.section_code} • {s.section_name} • {s.course} {s.year_level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAssignSection} disabled={!assignForm.sectionId}>
                Assign Section
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Record Dialog */}
      <Dialog open={viewStudentOpen} onOpenChange={setViewStudentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Record</DialogTitle>
            <DialogDescription>View student details and update requirement statuses.</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              {/* Personal Details - Read Only */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Personal Details</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-slate-600 text-xs">First Name</Label>
                    <p className="text-sm font-medium mt-1">{selectedRecord.first_name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600 text-xs">Last Name</Label>
                    <p className="text-sm font-medium mt-1">{selectedRecord.last_name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600 text-xs">Student ID</Label>
                    <p className="text-sm font-medium mt-1">{selectedRecord.student_id}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600 text-xs">Student Type</Label>
                    <p className="text-sm font-medium mt-1">{selectedRecord.student_type}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600 text-xs">Course</Label>
                    <p className="text-sm font-medium mt-1">{selectedRecord.course}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600 text-xs">Year Level</Label>
                    <p className="text-sm font-medium mt-1">Year {selectedRecord.year_level}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600 text-xs">Status</Label>
                    <p className="text-sm font-medium mt-1">{selectedRecord.status || 'Active'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600 text-xs">Clearance Status</Label>
                    <p className="text-sm font-medium mt-1">{selectedRecord.clearance_status || 'Clear'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600 text-xs">Classification</Label>
                    <p className="text-sm font-medium mt-1">
                      <Badge className={selectedRecord.student_classification === 'Irregular' ? 'bg-amber-100 text-amber-700 border-0' : 'bg-blue-100 text-blue-700 border-0'}>
                        {selectedRecord.student_classification || 'Regular'}
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>

              {/* Requirement Statuses - Editable */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Requirement Statuses</h3>
                <div className="space-y-3">
                  {selectedRecord.student_type === 'New' || selectedRecord.student_type === 'new' ? (
                    <>
                      <div>
                        <Label>Form 137 (Report Card)</Label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={editStudentForm.form137 || 'Pending'}
                          onChange={(e) => {
                            console.log('Form 137 changed from', editStudentForm.form137, 'to:', e.target.value);
                            setEditStudentForm((p: any) => {
                              const updated = { ...p, form137: e.target.value };
                              console.log('Updated form state:', updated);
                              return updated;
                            });
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Verified">Verified</option>
                          <option value="Incomplete">Incomplete</option>
                        </select>
                      </div>
                      <div>
                        <Label>Form 138 (Transcript of Records)</Label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={editStudentForm.form138 || 'Pending'}
                          onChange={(e) => {
                            console.log('Form 138 changed to:', e.target.value);
                            setEditStudentForm((p: any) => ({ ...p, form138: e.target.value }));
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Verified">Verified</option>
                          <option value="Incomplete">Incomplete</option>
                        </select>
                      </div>
                      <div>
                        <Label>Birth Certificate</Label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={editStudentForm.birth_certificate || 'Pending'}
                          onChange={(e) => {
                            console.log('Birth Certificate changed to:', e.target.value);
                            setEditStudentForm((p: any) => ({ ...p, birth_certificate: e.target.value }));
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Verified">Verified</option>
                          <option value="Incomplete">Incomplete</option>
                        </select>
                      </div>
                      <div>
                        <Label>Good Moral Certificate</Label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={editStudentForm.moral_certificate || 'Pending'}
                          onChange={(e) => {
                            console.log('Moral Certificate changed to:', e.target.value);
                            setEditStudentForm((p: any) => ({ ...p, moral_certificate: e.target.value }));
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Verified">Verified</option>
                          <option value="Incomplete">Incomplete</option>
                        </select>
                      </div>
                    </>
                  ) : selectedRecord.student_type === 'Transferee' || selectedRecord.student_type === 'transferee' ? (
                    <>
                      <div>
                        <Label>Transcript of Records (TOR)</Label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={editStudentForm.tor || 'Pending'}
                          onChange={(e) => {
                            console.log('TOR changed to:', e.target.value);
                            setEditStudentForm((p: any) => ({ ...p, tor: e.target.value }));
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Verified">Verified</option>
                          <option value="Incomplete">Incomplete</option>
                        </select>
                      </div>
                      <div>
                        <Label>Certificate of Transfer</Label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={editStudentForm.certificate_transfer || 'Pending'}
                          onChange={(e) => {
                            console.log('Certificate of Transfer changed to:', e.target.value);
                            setEditStudentForm((p: any) => ({ ...p, certificate_transfer: e.target.value }));
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Verified">Verified</option>
                          <option value="Incomplete">Incomplete</option>
                        </select>
                      </div>
                      <div>
                        <Label>Birth Certificate</Label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={editStudentForm.birth_certificate || 'Pending'}
                          onChange={(e) => {
                            console.log('Birth Certificate changed to:', e.target.value);
                            setEditStudentForm((p: any) => ({ ...p, birth_certificate: e.target.value }));
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Verified">Verified</option>
                          <option value="Incomplete">Incomplete</option>
                        </select>
                      </div>
                      <div>
                        <Label>Good Moral Certificate</Label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={editStudentForm.moral_certificate || 'Pending'}
                          onChange={(e) => {
                            console.log('Moral Certificate changed to:', e.target.value);
                            setEditStudentForm((p: any) => ({ ...p, moral_certificate: e.target.value }));
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Verified">Verified</option>
                          <option value="Incomplete">Incomplete</option>
                        </select>
                      </div>
                    </>
                  ) : selectedRecord.student_type === 'Returning' || selectedRecord.student_type === 'returning' ? (
                    <>
                      <div>
                        <Label>Form 137 (Report Card)</Label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={editStudentForm.form137 || 'Pending'}
                          onChange={(e) => {
                            console.log('Form 137 changed to:', e.target.value);
                            setEditStudentForm((p: any) => ({ ...p, form137: e.target.value }));
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Verified">Verified</option>
                          <option value="Incomplete">Incomplete</option>
                        </select>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Student Classification - Editable */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Student Classification</h3>
                <div className="space-y-3">
                  <div>
                    <Label>Classification Status</Label>
                    <select
                      className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={editStudentForm.student_classification || selectedRecord.student_classification || 'Regular'}
                      onChange={(e) => {
                        console.log('Student classification changed to:', e.target.value);
                        setEditStudentForm((p: any) => ({ ...p, student_classification: e.target.value }));
                      }}
                    >
                      <option value="Regular">Regular</option>
                      <option value="Irregular">Irregular</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">
                      Set to "Irregular" if student is not following normal academic progression (e.g., taking courses out of sequence, part-time enrollment, extended completion time)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setViewStudentOpen(false)}>Close</Button>
                <Button onClick={handleUpdateStudentRecord}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enrollment Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction?.type === 'approve' ? 'Approve Enrollment' : 'Reject Enrollment'}
            </DialogTitle>
            <DialogDescription>
              {approvalAction?.type === 'approve' 
                ? `Approve enrollment for ${approvalAction?.enrollment?.first_name} ${approvalAction?.enrollment?.last_name}?`
                : `Reject enrollment for ${approvalAction?.enrollment?.first_name} ${approvalAction?.enrollment?.last_name}?`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Remarks (Optional)</Label>
              <textarea 
                placeholder="Add any notes or feedback..."
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setApprovalDialogOpen(false);
                setApprovalAction(null);
                setApprovalRemarks('');
              }}>
                Cancel
              </Button>
              {approvalAction?.type === 'approve' ? (
                <Button 
                  className="bg-gradient-to-r from-green-600 to-green-700"
                  onClick={handleApproveEnrollment}
                  disabled={loading}
                >
                  {loading ? 'Approving...' : 'Approve'}
                </Button>
              ) : (
                <Button 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleRejectEnrollment}
                  disabled={loading}
                >
                  {loading ? 'Rejecting...' : 'Reject'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Documents Dialog */}
      <Dialog open={previewDocumentsOpen} onOpenChange={setPreviewDocumentsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Documents - {previewEnrollment?.first_name} {previewEnrollment?.last_name}
            </DialogTitle>
            <DialogDescription>
              Enrollment #{previewEnrollment?.id} • {previewEnrollment?.school_year} • {previewEnrollment?.semester}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!previewEnrollment?.documents || previewEnrollment?.documents?.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No documents submitted</p>
            ) : (
              <div className="space-y-2">
                {previewEnrollment?.documents?.map((doc: any, idx: number) => (
                  <div key={idx} className="p-3 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {doc.document_type || `Document ${idx + 1}`}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Uploaded: {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadDocument(doc.id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setPreviewDocumentsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};