import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { 
  User, 
  LogOut, 
  LayoutDashboard, 
  ClipboardList, 
  CreditCard, 
  Users, 
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  ChevronDown,
  Eye,
  FileText,
  Download,
  Plus,
  Trash2,
  Printer,
  UserPlus,
  UserMinus,
  Edit,
  X,
  Check as CheckIcon,
  Loader2,
  Search
} from 'lucide-react';
import { adminService } from '../services/admin.service';
import { enrollmentService } from '../services/enrollment.service';
import { transactionService } from '../services/transaction.service';
import { studentService } from '../services/student.service';
import { facultyService } from '../services/faculty.service';
import { gradesService } from '../services/grades.service';
import { maintenanceService } from '../services/maintenance.service';
import analyticsService from '../services/analytics.service';
import logsService from '../services/logs.service';
import coursesService from '../services/courses.service';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [manageOpen, setManageOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'student' | 'transaction' | 'installment'>('student');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [removeStudentOpen, setRemoveStudentOpen] = useState(false);
  const [addTeacherOpen, setAddTeacherOpen] = useState(false);
  const [editTeacherOpen, setEditTeacherOpen] = useState(false);
  const [removeTeacherOpen, setRemoveTeacherOpen] = useState(false);
  const [newTeacherForm, setNewTeacherForm] = useState({
    faculty_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    department: '',
    specialization: '',
    email: '',
    contact_number: ''
  });
  const [editTeacherForm, setEditTeacherForm] = useState({
    faculty_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    department: '',
    specialization: '',
    email: '',
    contact_number: '',
    status: 'Active'
  });
  const [newSectionForm, setNewSectionForm] = useState({
    section_code: '',
    section_name: '',
    course: '',
    year_level: 1,
    school_year: '',
    semester: '1st',
    capacity: 50,
    adviser_id: 0
  });
  const [editSectionForm, setEditSectionForm] = useState({
    section_code: '',
    section_name: '',
    course: '',
    year_level: 1,
    school_year: '',
    semester: '1st',
    capacity: 50,
    adviser_id: 0
  });
  const [newSubjectForm, setNewSubjectForm] = useState({
    subject_code: '',
    subject_name: '',
    description: '',
    units: 3,
    course: '',
    year_level: 1,
    semester: '1st',
    subject_type: 'College' as 'SHS' | 'College'
  });
  const [editSubjectForm, setEditSubjectForm] = useState({
    subject_code: '',
    subject_name: '',
    description: '',
    units: 3,
    course: '',
    year_level: 1,
    semester: '1st',
    subject_type: 'College' as 'SHS' | 'College'
  });
  const [newSchoolYearForm, setNewSchoolYearForm] = useState({
    school_year: '',
    start_date: '',
    end_date: '',
    enrollment_start: '',
    enrollment_end: '',
    is_active: false
  });
  const [editSchoolYearForm, setEditSchoolYearForm] = useState({
    school_year: '',
    start_date: '',
    end_date: '',
    enrollment_start: '',
    enrollment_end: '',
    is_active: false
  });
  const [editingSection, setEditingSection] = useState<any>(null);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [editingSchoolYear, setEditingSchoolYear] = useState<any>(null);
  const [viewGradesOpen, setViewGradesOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [addSchoolYearOpen, setAddSchoolYearOpen] = useState(false);
  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [removeSectionOpen, setRemoveSectionOpen] = useState(false);
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [editSubjectOpen, setEditSubjectOpen] = useState(false);
  const [removeSubjectOpen, setRemoveSubjectOpen] = useState(false);
  const [editSchoolYearOpen, setEditSchoolYearOpen] = useState(false);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('2024-2025');
  const [selectedSemester, setSelectedSemester] = useState('1st');
  const [editGradesOpen, setEditGradesOpen] = useState(false);
  const [updateStudentOpen, setUpdateStudentOpen] = useState(false);
  const [editEnrollmentOpen, setEditEnrollmentOpen] = useState(false);
  const [editTransactionOpen, setEditTransactionOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [studentStatusForm, setStudentStatusForm] = useState<any>({
    corStatus: '',
    gradesComplete: false,
    clearanceStatus: ''
  });
  const [confirmAction, setConfirmAction] = useState<{
    open: boolean;
    type: 'approve-transaction' | 'deny-transaction' | null;
    item: any;
  }>({ open: false, type: null, item: null });

  // Data state
  const [stats, setStats] = useState<any[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [logsPage, setLogsPage] = useState<number>(1);
  const [logsLimit, setLogsLimit] = useState<number>(25);
  const [logsTotal, setLogsTotal] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [logsMoreLoading, setLogsMoreLoading] = useState<boolean>(false);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [auditTrailPage, setAuditTrailPage] = useState<number>(1);
  const [auditTrailLimit, setAuditTrailLimit] = useState<number>(25);
  const [auditTrailTotal, setAuditTrailTotal] = useState<number | null>(null);
  const [auditTrailLoading, setAuditTrailLoading] = useState<boolean>(false);
  const [auditTrailSearch, setAuditTrailSearch] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateUploading, setTemplateUploading] = useState<boolean>(false);
  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
  const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([]);
  const [adminEnrollOpen, setAdminEnrollOpen] = useState(false);
  const [selectedAdminEnroll, setSelectedAdminEnroll] = useState<any>(null);
  const [adminEnrollDetails, setAdminEnrollDetails] = useState<any>(null);
  const [adminEnrollDocuments, setAdminEnrollDocuments] = useState<any[]>([]);
  const [adminEnrollLoading, setAdminEnrollLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [installmentPayments, setInstallmentPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [accountRequests, setAccountRequests] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [schoolYears, setSchoolYears] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [studentTypes] = useState(['New', 'Transferee', 'Returning', 'Continuing', 'Scholar']);
  const [semesters] = useState(['1st', '2nd', '3rd']);
  const [selectedSchoolYearForSemester, setSelectedSchoolYearForSemester] = useState<any>(null);
  const [activeSemestersInSY, setActiveSemestersInSY] = useState<string[]>([]);
  const [schoolYearSemesters, setSchoolYearSemesters] = useState<any[]>([]);
  const [activeSemesterConfig, setActiveSemesterConfig] = useState<string | null>(null);
  const [shsStudents, setShsStudents] = useState<any[]>([]);
  const [collegeStudents, setCollegeStudents] = useState<any[]>([]);
  const [shsGrades, setShsGrades] = useState<any[]>([]);
  const [collegeGrades, setCollegeGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  // Student Documents state
  const [sdSearchStudent, setSDSearchStudent] = useState('');
  const [sdEnrollments, setSDEnrollments] = useState<any[]>([]);
  const [sdSelectedEnrollment, setSDSelectedEnrollment] = useState<any>(null);
  const [sdDocuments, setSDDocuments] = useState<any[]>([]);
  const [sdLoading, setSDLoading] = useState(false);

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<any>({
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
    isLoading: false
  });

  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [editingAccountRequest, setEditingAccountRequest] = useState<any>(null);
  const [editAccountForm, setEditAccountForm] = useState<any>({
    student_id: '',
  });
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<any>(null);

  // Role label helpers: switch text between Faculty and Teacher based on active section
  const isFacultySection = activeSection === 'Manage Faculty';
  const personSingular = isFacultySection ? 'Faculty' : 'Teacher';
  const personPlural = isFacultySection ? 'Faculty' : 'Teachers';

  // Form state for dialogs
  const [newStudentForm, setNewStudentForm] = useState({
    student_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    student_type: 'New',
    course: '',
    year_level: 1,
    email: '',
    contact_number: '',
    address: '',
    birth_date: '',
    gender: ''
  });
  const [selectedStudentToDelete, setSelectedStudentToDelete] = useState<string>('');

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
    // load templates
    (async () => {
      try {
        const list = await adminService.listTemplates();
        setTemplates(list?.data || list || []);
      } catch (err) {
        console.error('Failed to load templates', err);
      }
    })();
  }, [activeSection, selectedSchoolYear, selectedSemester]);

  // Load Student Documents enrollments when section is active
  useEffect(() => {
    if (activeSection === 'Student Documents' && sdEnrollments.length === 0) {
      const loadEnrollments = async () => {
        try {
          setSDLoading(true);
          const response = await enrollmentService.getAllEnrollments();
          setSDEnrollments(response?.data || []);
        } catch (err) {
          console.error('Failed to load enrollments:', err);
        } finally {
          setSDLoading(false);
        }
      };
      loadEnrollments();
    }
  }, [activeSection]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      if (activeSection === 'Dashboard') {
        const response = await adminService.getDashboardStats();
        const statsData = response.data || response;
        
        // Calculate enrollment counts from stats
        let enrolledCount = 0;
        let pendingCount = 0;
        if (statsData.enrollmentStats && Array.isArray(statsData.enrollmentStats)) {
          const approved = statsData.enrollmentStats.find((s: any) => s.status === 'Approved');
          const pending = statsData.enrollmentStats.find((s: any) => s.status === 'Pending' || s.status === 'Pending Assessment' || s.status === 'For Admin Approval');
          enrolledCount = approved?.count || 0;
          pendingCount = pending?.count || 0;
        }
        
        setStats([
          { 
            label: 'Total Students', 
            value: (statsData.totalStudents || 0).toString(), 
            icon: Users, 
            color: 'from-blue-500 to-blue-600',
            change: '+0%'
          },
          { 
            label: 'Enrolled', 
            value: enrolledCount.toString(), 
            icon: CheckCircle, 
            color: 'from-green-500 to-green-600',
            change: '+0%'
          },
          { 
            label: 'Pending', 
            value: pendingCount.toString(), 
            icon: Clock, 
            color: 'from-orange-500 to-orange-600',
            change: '+0'
          },
          { 
            label: 'Active Courses', 
            value: '0', 
            icon: BookOpen, 
            color: 'from-purple-500 to-purple-600',
            change: '+0'
          },
        ]);

        // Fetch recent enrollments (approved)
        const enrollmentsData = await adminService.getAllEnrollments({ status: 'Approved' });
        const recent = enrollmentsData.data?.slice(0, 10).map((e: any) => ({
          name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
          course: e.course || 'N/A',
          section: e.section || '',
          status: e.status,
          time: formatTimeAgo(e.created_at)
        })) || [];
        setRecentEnrollments(recent);

        // Fetch usage analytics (platform-level)
        try {
          const usageResp = await analyticsService.fetchUsage();
          setUsageStats(usageResp?.data || usageResp || null);
        } catch (err) {
          console.error('Failed to load usage analytics:', err);
        }
        // Fetch recent activity logs (first page)
        try {
          const logsResp = await logsService.listLogs({ page: 1, limit: logsLimit });
          setActivityLogs(logsResp?.data || logsResp || []);
          setLogsTotal(logsResp?.meta?.total ?? null);
          setLogsPage(1);
        } catch (err) {
          console.error('Failed to load activity logs:', err);
        }
      }

      // Fetch enrollments
      if (activeSection === 'Dashboard' || activeSection === 'Enrollment Request') {
        // Fetch only enrollments with pending/approval statuses
        const statuses = ['Pending Assessment', 'For Admin Approval', 'For Registrar Assessment', 'For Payment', 'For Subject Selection'];
        const allPending = [];
        
        for (const status of statuses) {
          try {
            const pendingData = await adminService.getAllEnrollments({ status });
            allPending.push(...(pendingData.data || []));
          } catch (err) {
            console.error(`Error fetching enrollments with status ${status}:`, err);
          }
        }
        
        const pending = allPending.map((e: any) => ({
          id: `#E-${e.id}`,
          enrollmentId: e.id,
          student: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
          course: e.course || 'N/A',
          date: formatDate(e.created_at),
          priority: 'medium',
          type: e.student_type || 'New Student',
          hasDocuments: (e.documents_count || 0) > 0,
          status: e.status,
          ...e
        })) || [];
        setPendingEnrollments(pending);
      }

      // Fetch transactions
      if (activeSection === 'Dashboard' || activeSection === 'Transactions') {
        const transactionsData = await transactionService.getAllTransactions();
        const txnList = transactionsData.data?.map((t: any) => ({
          id: `TXN-${String(t.id).padStart(4, '0')}`,
          transactionId: t.id,
          student: `${t.enrollment?.student?.first_name || ''} ${t.enrollment?.student?.last_name || ''}`.trim(),
          type: t.transaction_type,
          amount: `₱${parseFloat(t.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          date: formatDate(t.created_at),
          status: t.status,
          hasReceipt: !!t.receipt_path,
          ...t
        })) || [];
        setTransactions(txnList);
      }

      if (activeSection === 'Installment Payments') {
        try {
          const installmentData = await adminService.getAllInstallmentPayments?.();
          if (installmentData?.data) {
            const installmentList = installmentData.data.map((ip: any) => ({
              id: `INST-${String(ip.id).padStart(4, '0')}`,
              installmentId: ip.id,
              student: `${ip.student?.first_name || ip.first_name || ''} ${ip.student?.last_name || ip.last_name || ''}`.trim(),
              period: ip.period,
              amount: `₱${parseFloat(ip.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
              date: formatDate(ip.created_at),
              status: ip.status,
              hasReceipt: !!ip.receipt_path,
              ...ip
            }));
            setInstallmentPayments(installmentList);
          }
        } catch (err) {
          console.error('Failed to fetch installment payments:', err);
          setInstallmentPayments([]);
        }
      }

      // Fetch account requests
      if (activeSection === 'Account Requests') {
        try {
          const accountRequestsData = await adminService.getAllStudents();
          const accountList = accountRequestsData.data
            ?.filter((s: any) => s.status !== 'Active')
            ?.map((s: any) => ({
              ...s,
              id: s.student_id,
              studentId: s.id,
              dbId: s.id,
              name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
              course: s.course || 'N/A',
              year: s.year_level ? `${s.year_level}${getOrdinalSuffix(s.year_level)}` : 'N/A',
              section: s.section || 'N/A',
              studentType: s.student_type || 'New',
              email: s.email || 'N/A',
              contactNumber: s.contact_number || 'N/A',
              status: s.status || 'Pending'
            })) || [];
          setAccountRequests(accountList);
        } catch (err) {
          console.error('Failed to fetch account requests:', err);
          setAccountRequests([]);
        }
      }

      // Fetch students
      if (activeSection === 'Manage Students' || activeSection === 'SHS Grades' || activeSection === 'College Grades') {
        const studentsData = await adminService.getAllStudents({ status: 'Active' });
        const studentList = studentsData.data?.map((s: any) => ({
          ...s,
          id: s.student_id,
          studentId: s.id,
          dbId: s.id,
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          course: s.course || 'N/A',
          year: s.year_level ? `${s.year_level}${getOrdinalSuffix(s.year_level)}` : 'N/A',
          section: s.section || 'N/A',
          corStatus: s.cor_status || 'Updated',
          gradesComplete: s.grades_complete || false,
          clearanceStatus: s.clearance_status || 'Cleared',
        })) || [];
        setStudents(studentList);

        // Separate SHS and College students
        const shs = studentList.filter((s: any) => s.course?.includes('SHS') || s.course?.includes('Senior'));
        const college = studentList.filter((s: any) => !s.course?.includes('SHS') && !s.course?.includes('Senior'));
        setShsStudents(shs);
        setCollegeStudents(college);
      }

      // Fetch teachers
      if (activeSection === 'Manage Teachers') {
        const teachersData = await facultyService.getAllFaculty();
        if (teachersData.success) {
          setTeachers(teachersData.data || []);
        }
      }

      // Fetch courses
      try {
        const coursesData = await coursesService.listCourses();
        const apiCourses = coursesData?.data || coursesData || [];
        if (apiCourses.length > 0) {
          setCourses(apiCourses);
        } else {
          // Fallback: derive courses from students already loaded, or fetch all students to extract
          const allStudentsData = await adminService.getAllStudents();
          const allStudents = allStudentsData?.data || [];
          const seen = new Set<string>();
          const derived: any[] = [];
          for (const s of allStudents) {
            const c = s.course;
            if (c && c !== 'N/A' && !seen.has(c.toUpperCase())) {
              seen.add(c.toUpperCase());
              derived.push({ id: `derived-${c}`, program_code: c, program_name: c, description: '' });
            }
          }
          setCourses(derived);
        }
      } catch (err) {
        console.error('Failed to load courses from API, deriving from students', err);
        // Fallback: extract unique courses from already-loaded students array
        const seen = new Set<string>();
        const derived: any[] = [];
        for (const s of students) {
          const c = s.course;
          if (c && c !== 'N/A' && !seen.has(c.toUpperCase())) {
            seen.add(c.toUpperCase());
            derived.push({ id: `derived-${c}`, program_code: c, program_name: c, description: '' });
          }
        }
        setCourses(derived);
      }

      // Fetch sections
      if (activeSection === 'Sections') {
        const sectionsData = await maintenanceService.getAllSections();
        if (sectionsData.success) {
          setSections(sectionsData.data || []);
        }
      }

      // Fetch subjects
      if (activeSection === 'SHS Subjects' || activeSection === 'College Subjects') {
        const subjectType = activeSection === 'SHS Subjects' ? 'SHS' : 'College';
        const subjectsData = await maintenanceService.getAllSubjectsByType({ subject_type: subjectType });
        if (subjectsData.success) {
          setSubjects(subjectsData.data || []);
        }
      }

      // Fetch school years
      if (activeSection === 'School Year') {
        const schoolYearsData = await maintenanceService.getAllSchoolYears();
        if (schoolYearsData.success) {
          setSchoolYears(schoolYearsData.data || []);
        }
      }

      // Fetch grades for SHS
      if (activeSection === 'SHS Grades' && shsStudents.length > 0) {
        // Fetch grades for first student as example - in real app, would fetch all
        if (shsStudents[0]) {
          const gradesData = await gradesService.getStudentGrades(shsStudents[0].id, { subject_type: 'SHS' });
          setShsGrades(gradesData?.data || gradesData || []);
        }
      }

      // Fetch grades for College
      if (activeSection === 'College Grades' && collegeStudents.length > 0) {
        // Fetch grades for first student as example - in real app, would fetch all
        if (collegeStudents[0]) {
          const gradesData = await gradesService.getStudentGrades(collegeStudents[0].id, { subject_type: 'College' });
          setCollegeGrades(gradesData?.data || gradesData || []);
        }
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      alert(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: string) => {
    if (!date) return 'N/A';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  // Placeholder data removed - now using state from backend

  // Placeholder data removed - now using state from backend

  const handlePreviewStudent = async (pending: any) => {
    try {
      setLoading(true);
      const resp = await adminService.getEnrollmentById(pending.enrollmentId || pending.id || pending.enrollmentId);
      const data = resp.data || resp;
      setSelectedItem(data);
      setPreviewType('student');
      setPreviewOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load enrollment details');
    } finally {
      setLoading(false);
    }
  };

  const openAdminEnrollView = async (enr: any) => {
    setSelectedAdminEnroll(enr);
    setAdminEnrollDetails(null);
    setAdminEnrollDocuments([]);
    setAdminEnrollOpen(true);
    setAdminEnrollLoading(true);
    try {
      const [detailsResp, docsResp] = await Promise.all([
        enrollmentService.getEnrollmentDetails(enr.enrollmentId),
        adminService.getEnrollmentDocuments(enr.enrollmentId)
      ]);
      const details = detailsResp?.data || {};
      setAdminEnrollDetails(details);
      if (docsResp.success) setAdminEnrollDocuments(docsResp.data || []);
    } catch (err: any) {
      console.error('Failed to load enrollment view:', err);
    } finally {
      setAdminEnrollLoading(false);
    }
  };

  const handleAdminDownloadDocument = (docId: number) => {
    const token = localStorage.getItem('auth_token');
    const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000';
    window.open(`${baseUrl}/api/admin/documents/${docId}/download?token=${token}`, '_blank');
  };

  const handlePreviewTransaction = (transaction: any) => {
    setSelectedItem(transaction);
    setPreviewType('transaction');
    setPreviewOpen(true);
  };

  const handleViewGrades = (student: any) => {
    setSelectedStudent(student);
    setViewGradesOpen(true);
  };

  const handleEditGrades = (student: any) => {
    setSelectedStudent(student);
    setEditGradesOpen(true);
  };

  const handleUpdateStudent = (student: any) => {
    setSelectedStudent(student);
    setStudentStatusForm({
      corStatus: student.corStatus || 'Updated',
      gradesComplete: student.gradesComplete ? 'Complete' : 'Incomplete',
      clearanceStatus: student.clearanceStatus || 'Clear'
    });
    setUpdateStudentOpen(true);
  };

  // Grades edit helpers
  const handleAddSubject = () => {
    if (!selectedStudent) return;
    const grades = Array.isArray(selectedStudent.grades) ? [...selectedStudent.grades] : [];
    grades.push({ subject: '', grade: '', enrollment_subject_id: null });
    setSelectedStudent({ ...selectedStudent, grades });
  };

  const handleRemoveSubject = (index: number) => {
    if (!selectedStudent) return;
    const grades = [...(selectedStudent.grades || [])];
    grades.splice(index, 1);
    setSelectedStudent({ ...selectedStudent, grades });
  };

  const handleUpdateGradeField = (index: number, field: string, value: any) => {
    if (!selectedStudent) return;
    const grades = [...(selectedStudent.grades || [])];
    grades[index] = { ...(grades[index] || {}), [field]: value };
    setSelectedStudent({ ...selectedStudent, grades });
  };

  const handlePrintGrades = () => {
    window.print();
  };

  const handleEditEnrollment = (enrollment: any) => {
    setEditingItem(enrollment);
    setEditEnrollmentOpen(true);
  };

  const handleEditTransaction = (transaction: any) => {
    setEditingItem(transaction);
    setEditTransactionOpen(true);
  };

  const handleSaveEnrollmentEdit = async () => {
    if (!editingItem?.enrollmentId) return;
    
    try {
      setLoadingSection('edit-enrollment');
      await adminService.updateEnrollmentStatus(
        editingItem.enrollmentId,
        editingItem.status || 'Pending'
      );
      alert(`Enrollment request updated for ${editingItem.student}`);
      setEditEnrollmentOpen(false);
      setEditingItem(null);
      await fetchDashboardData();
    } catch (error: any) {
      alert(error.message || 'Failed to update enrollment');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleSaveTransactionEdit = async () => {
    if (!editingItem?.transactionId) return;
    
    try {
      setLoadingSection('edit-transaction');
      await transactionService.updateTransactionStatus(
        editingItem.transactionId,
        editingItem.status || 'Pending'
      );
      alert(`Transaction updated for ${editingItem.student}`);
      setEditTransactionOpen(false);
      setEditingItem(null);
      await fetchDashboardData();
    } catch (error: any) {
      alert(error.message || 'Failed to update transaction');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleSaveStudentStatus = async () => {
    if (!selectedStudent?.studentId) return;
    
    try {
      setLoadingSection('update-student-status');
      // Only send the status fields we're updating
      await adminService.updateStudent(selectedStudent.studentId, {
        cor_status: studentStatusForm.corStatus,
        grades_complete: studentStatusForm.gradesComplete === 'Complete',
        clearance_status: studentStatusForm.clearanceStatus
      });
      alert(`Student status updated for ${selectedStudent.name}`);
      setUpdateStudentOpen(false);
      // reflect changes locally
      setStudents(prev => prev.map(s => s.studentId === selectedStudent.studentId ? { ...s, corStatus: studentStatusForm.corStatus, gradesComplete: studentStatusForm.gradesComplete === 'Complete', clearanceStatus: studentStatusForm.clearanceStatus } : s));
      setStudentStatusForm({
        corStatus: '',
        gradesComplete: false,
        clearanceStatus: ''
      });
      await fetchDashboardData();
    } catch (error: any) {
      alert(error.message || 'Failed to update student status');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleCreateTeacher = async () => {
    try {
      setError('');
      setLoadingSection('create-teacher');
      await facultyService.createFaculty(newTeacherForm);
      setAddTeacherOpen(false);
      setNewTeacherForm({
        faculty_id: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        department: '',
        specialization: '',
        email: '',
        contact_number: ''
      });
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to create teacher');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleUpdateTeacher = async () => {
    try {
      setError('');
      setLoadingSection('update-teacher');
      await facultyService.updateFaculty(selectedStudent.id, editTeacherForm);
      setEditTeacherOpen(false);
      setSelectedStudent(null);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to update teacher');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleDeleteTeacher = async () => {
    try {
      setError('');
      setLoadingSection('delete-teacher');
      await facultyService.deleteFaculty(selectedStudent.id);
      setRemoveTeacherOpen(false);
      setSelectedStudent(null);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete teacher');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleCreateSection = async (sectionData: any) => {
    try {
      setError('');
      setLoadingSection('create-section');
      await maintenanceService.createSection(sectionData);
      setAddSectionOpen(false);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to create section');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleCreateSubject = async (subjectData: any) => {
    try {
      setError('');
      setLoadingSection('create-subject');
      await maintenanceService.createSubject(subjectData);
      setAddSubjectOpen(false);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to create subject');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleCreateSchoolYear = async (schoolYearData: any) => {
    try {
      setError('');
      setLoadingSection('create-school-year');
      await maintenanceService.createSchoolYear(schoolYearData);
      setAddSchoolYearOpen(false);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to create school year');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleUpdateSection = async () => {
    if (!editingSection) return;
    try {
      setError('');
      setLoadingSection('update-section');
      await maintenanceService.updateSection(editingSection.id, editSectionForm);
      setEditSectionOpen(false);
      setEditingSection(null);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to update section');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject) return;
    try {
      setError('');
      setLoadingSection('update-subject');
      await maintenanceService.updateSubject(editingSubject.id, editSubjectForm);
      setEditSubjectOpen(false);
      setEditingSubject(null);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to update subject');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleUpdateSchoolYear = async () => {
    if (!editingSchoolYear) return;
    try {
      setError('');
      setLoadingSection('update-school-year');
      await maintenanceService.updateSchoolYear(editingSchoolYear.id, editSchoolYearForm);
      setEditSchoolYearOpen(false);
      setEditingSchoolYear(null);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to update school year');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleSaveGrades = async () => {
    if (!selectedStudent?.grades) return;
    try {
      setError('');
      setLoadingSection('save-grades');
      // Convert grades array to the format expected by the API
      // Only include entries with a valid enrollment_subject_id and a grade value
      const gradesToUpdate = selectedStudent.grades
        .filter((g: any) => (g.enrollment_subject_id || g.enrollment_subject_id === 0) && g.grade !== '' && g.grade !== null && g.grade !== undefined)
        .map((g: any) => ({
          enrollment_subject_id: g.enrollment_subject_id,
          grade: g.grade
        }));
      
      if (gradesToUpdate.length > 0) {
        await gradesService.bulkUpdateGrades(gradesToUpdate);
        alert('Grades saved and submitted for dean approval');
        setEditGradesOpen(false);
        await fetchDashboardData();
      } else {
        // Provide detailed error info
        const hasNoGrades = selectedStudent.grades.every((g: any) => !g.grade || g.grade === '');
        const hasNoIds = selectedStudent.grades.some((g: any) => !(g.enrollment_subject_id || g.enrollment_subject_id === 0));
        
        let msg = 'No valid grades to save. ';
        if (hasNoGrades) {
          msg += 'Please enter at least one grade for a subject.';
        } else if (hasNoIds) {
          msg += 'Some subjects are missing enrollment data. Try reloading the student.';
        }
        alert(msg);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update grades');
      alert(err.message || 'Failed to update grades');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleApproveTransaction = (transaction: any) => {
    setConfirmAction({ open: true, type: 'approve-transaction', item: transaction });
  };

  const handleDenyTransaction = (transaction: any) => {
    setConfirmAction({ open: true, type: 'deny-transaction', item: transaction });
  };

  const confirmActionHandler = async () => {
    const { type, item } = confirmAction;
    
    try {
      setLoadingSection(type || '');
      
      switch (type) {
        case 'approve-transaction':
          await transactionService.updateTransactionStatus(item.transactionId, 'Approved');
          alert(`Transaction ${item.id} approved.`);
          break;
        case 'deny-transaction':
          await transactionService.updateTransactionStatus(item.transactionId, 'Denied');
          alert(`Transaction ${item.id} denied.`);
          break;
      }
      
      setConfirmAction({ open: false, type: null, item: null });
      await fetchDashboardData();
    } catch (error: any) {
      alert(error.message || 'Failed to process action');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleAddStudent = async () => {
    try {
      setLoadingSection('add-student');
      // Create the student
      const result = await adminService.createStudent(newStudentForm);
      
      // Create account for the newly added student with username as student_id
      try {
        await adminService.createAccountsForExistingStudents();
      } catch (accountErr) {
        console.warn('Account creation completed but with warnings:', accountErr);
        // Don't fail the student creation if account creation has issues
      }
      
      alert('Student added successfully and account created');
      setAddStudentOpen(false);
      setNewStudentForm({
        student_id: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        student_type: 'New',
        course: '',
        year_level: 1,
        email: '',
        contact_number: '',
        address: '',
        birth_date: '',
        gender: ''
      });
      await fetchDashboardData();
    } catch (error: any) {
      alert(error.message || 'Failed to add student');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudentToDelete) return;
    
    try {
      setLoadingSection('delete-student');
      const student = students.find(s => s.id === selectedStudentToDelete);
      if (student?.studentId) {
        await adminService.deleteStudent(student.studentId);
        alert('Student removed successfully');
        setRemoveStudentOpen(false);
        setSelectedStudentToDelete('');
        await fetchDashboardData();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to remove student');
    } finally {
      setLoadingSection(null);
    }
  };

  const handleExportStudents = async () => {
    try {
      setLoadingSection('export-students');
      const { reportsService } = await import('../services/reports.service');
      const blob = await reportsService.exportStudentsCsv();
      const url = window.URL.createObjectURL(blob as any);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students_report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export students');
    } finally {
      setLoadingSection(null);
    }
  };

  const renderDashboardContent = () => (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-6 border-0 shadow-lg bg-white">
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            </Card>
          ))
        ) : (
          stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="p-6 border-0 shadow-lg hover:shadow-xl transition-all bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-0">
                    {stat.change}
                  </Badge>
                </div>
                <h3 className="text-3xl mb-1">{stat.value}</h3>
                <p className="text-sm text-slate-600">{stat.label}</p>
              </Card>
            );
          })
        )}

        {/* Forms / Templates Manager is moved below the stats grid to span full width */}
      </div>

        {usageStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-xs text-slate-500">Active Users (24h)</p>
              <p className="text-xl font-semibold">{usageStats.activeUsers24h || 0}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-xs text-slate-500">Staff Accounts</p>
              <p className="text-xl font-semibold">{usageStats.staffAccounts || 0}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-xs text-slate-500">Active Students</p>
              <p className="text-xl font-semibold">{usageStats.activeStudents || 0}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-xs text-slate-500">API Calls (24h)</p>
              <p className="text-xl font-semibold">{usageStats.apiCallsLast24h || 0}</p>
            </Card>
          </div>
        )}

        {/* Activity Logs */}
        <Card className="border-0 shadow-lg my-4">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
            <h3 className="text-white">Activity Logs</h3>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600">Recent system activity and API events</p>
                <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={async () => {
                try {
                  setLogsLoading(true);
                  const logsResp = await logsService.listLogs({ page: 1, limit: logsLimit });
                  setActivityLogs(logsResp?.data || logsResp || []);
                  setLogsTotal(logsResp?.meta?.total ?? null);
                  setLogsPage(1);
                } catch (err) {
                  console.error('Failed refreshing logs:', err);
                } finally {
                  setLogsLoading(false);
                }
              }}>Refresh</Button>
            </div>
            </div>
            <ScrollArea className="h-[240px]">
              <div className="space-y-2">
                {activityLogs.length === 0 ? (
                  <p className="text-sm text-slate-500">No recent activity</p>
                ) : activityLogs.map((log: any) => (
                  <div key={log.id || `${log.user_id}-${log.ts}`} className="p-3 border rounded-lg bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-900 font-medium">{log.action || log.type || 'Activity'}</p>
                        <p className="text-xs text-slate-500">{log.details || log.message || ''}</p>
                      </div>
                      <div className="text-xs text-slate-400">{new Date(log.created_at || log.ts || log.time || Date.now()).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-3 flex items-center justify-center">
              {logsMoreLoading ? (
                <Button size="sm" disabled>Loading...</Button>
              ) : (logsTotal == null || activityLogs.length < logsTotal) ? (
                <Button size="sm" onClick={async () => {
                  try {
                    setLogsMoreLoading(true);
                    const nextPage = logsPage + 1;
                    const resp = await logsService.listLogs({ page: nextPage, limit: logsLimit });
                    const newItems = resp?.data || resp || [];
                    setActivityLogs(prev => [...prev, ...newItems]);
                    setLogsPage(nextPage);
                    setLogsTotal(resp?.meta?.total ?? logsTotal);
                  } catch (err) {
                    console.error('Failed to load more logs:', err);
                  } finally {
                    setLogsMoreLoading(false);
                  }
                }}>Load more</Button>
              ) : (
                <p className="text-xs text-slate-500">No more activity</p>
              )}
            </div>
          </div>
        </Card>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
        {/* Recent Enrollments */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h3 className="text-white">Recent Enrollments</h3>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : recentEnrollments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No recent enrollments</p>
              ) : (
                <div className="space-y-2">
                  {recentEnrollments.map((enrollment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm shrink-0">
                        {enrollment.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-900 truncate">{enrollment.name}</p>
                        <p className="text-xs text-slate-500">{enrollment.course}{enrollment.section ? ` • Section ${enrollment.section}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs px-2 py-0">
                        {enrollment.status}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-0.5">{enrollment.time}</p>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Pending Enrollments */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
            <h3 className="text-white">Pending Enrollments</h3>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : pendingEnrollments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No pending enrollments</p>
              ) : (
                <div className="space-y-2">
                  {pendingEnrollments.map((pending, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm text-slate-900 truncate">{pending.student}</p>
                        {pending.priority === 'high' && (
                          <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{pending.id} • {pending.course}{pending.section ? ` • Section ${pending.section}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <Button 
                        size="sm" 
                        onClick={() => handlePreviewStudent(pending)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-7 text-xs px-3"
                      >
                        Review
                      </Button>
                      <p className="text-xs text-slate-500 mt-0.5">{pending.date}</p>
                    </div>
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

  const getEnrollStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Assessment': return 'bg-orange-100 text-orange-700';
      case 'For Registrar Assessment': return 'bg-yellow-100 text-yellow-700';
      case 'For Dean Approval': return 'bg-blue-100 text-blue-700';
      case 'For Payment': return 'bg-indigo-100 text-indigo-700';
      case 'Payment Verification': return 'bg-purple-100 text-purple-700';
      case 'Enrolled': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const renderEnrollmentRequestsContent = () => (
    <div>
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          <p className="text-slate-600 mb-6">View all student enrollments and their current status in the enrollment pipeline.</p>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : pendingEnrollments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No enrollments found</p>
          ) : (
            <div className="space-y-3">
              {pendingEnrollments.map((enr, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-slate-900">{enr.student}</h4>
                      <Badge className={`border-0 text-xs ${getEnrollStatusColor(enr.status)}`}>{enr.status || 'Unknown'}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{enr.id} • {enr.course}{enr.section ? ` • Section ${enr.section}` : ''} • {enr.type} • {enr.date}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openAdminEnrollView(enr)} className="gap-2">
                    <Eye className="h-4 w-4" /> View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Enrollment View Dialog */}
      <Dialog open={adminEnrollOpen} onOpenChange={setAdminEnrollOpen}>
        <DialogContent className="max-w-4xl sm:max-w-4xl flex flex-col p-0 gap-0 overflow-hidden" style={{ maxHeight: '85vh' }}>
          {/* Gradient header */}
          <div className="shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold leading-tight">{selectedAdminEnroll?.student || 'Enrollment Details'}</h2>
                <p className="text-slate-300 text-sm mt-0.5">
                  {selectedAdminEnroll?.course}{selectedAdminEnroll?.section ? ` · Section ${selectedAdminEnroll.section}` : ''} &nbsp;·&nbsp; {selectedAdminEnroll?.semester} Sem {selectedAdminEnroll?.school_year} &nbsp;·&nbsp; {selectedAdminEnroll?.type}
                </p>
              </div>
              {selectedAdminEnroll && (
                <span className={`mt-0.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getEnrollStatusColor(selectedAdminEnroll.status)}`}>
                  {selectedAdminEnroll.status || 'Unknown'}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-6">
            {adminEnrollLoading || !adminEnrollDetails ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <Loader2 className="h-9 w-9 animate-spin" />
                <span className="text-sm">Loading enrollment details…</span>
              </div>
            ) : (() => {
              const enrollment = adminEnrollDetails.enrollment || selectedAdminEnroll;
              const subjects = adminEnrollDetails.subjects || [];
              const totalUnits = subjects.reduce((s: number, x: any) => s + (x.units || 0), 0);
              const covStr = enrollment?.scholarship_coverage || '';
              const covPct = parseFloat(covStr) / 100 || 0;
              const tuition = enrollment?.tuition || 0;
              const baseTuition = covPct > 0 ? tuition / (1 - covPct) : tuition;
              const deduction = covPct > 0 ? baseTuition - tuition : 0;
              const miscTotal = (enrollment?.registration || 0) + (enrollment?.library || 0) + (enrollment?.lab || 0) + (enrollment?.id_fee || 0) + (enrollment?.others || 0);
              return (
                <div className="grid grid-cols-5 gap-6">
                  {/* ── Left column ── */}
                  <div className="col-span-2 space-y-5">

                    {/* Subjects */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-4 rounded-full bg-emerald-500" />
                        <h4 className="font-semibold text-sm text-slate-700">Assigned Subjects</h4>
                        {subjects.length > 0 && (
                          <span className="ml-auto text-xs text-slate-400">{totalUnits} units total</span>
                        )}
                      </div>
                      {subjects.length === 0 ? (
                        <p className="text-xs text-slate-400 italic pl-3">No subjects assigned yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {subjects.map((s: any, i: number) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                              <div>
                                <span className="font-semibold text-slate-800">{s.subject_code}</span>
                                <p className="text-slate-500 mt-0.5 leading-tight">{s.subject_name}</p>
                              </div>
                              <span className="shrink-0 ml-2 text-slate-500 font-medium">{s.units}u</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Documents */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-4 rounded-full bg-blue-500" />
                        <h4 className="font-semibold text-sm text-slate-700">Documents</h4>
                        {adminEnrollDocuments.length > 0 && (
                          <span className="ml-auto text-xs text-slate-400">{adminEnrollDocuments.length} file{adminEnrollDocuments.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                      {adminEnrollDocuments.length === 0 ? (
                        <p className="text-xs text-slate-400 italic pl-3">No documents uploaded.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {adminEnrollDocuments.map((doc: any) => (
                            <div key={doc.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 bg-white text-xs hover:bg-slate-50 transition-colors">
                              <span className="truncate flex-1 text-slate-700">{doc.document_type || doc.file_name}</span>
                              <button
                                onClick={() => handleAdminDownloadDocument(doc.id)}
                                className="ml-2 shrink-0 flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  {/* ── Right column: Fee Breakdown ── */}
                  <div className="col-span-3 space-y-5">

                    {/* Scholarship badge */}
                    {enrollment?.scholarship_type && enrollment.scholarship_type !== 'None' && (
                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100">
                        <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-100">
                          <GraduationCap className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-indigo-700">{enrollment.scholarship_type}</p>
                          {enrollment.scholarship_coverage && (
                            <p className="text-xs text-slate-500 mt-0.5">{enrollment.scholarship_coverage} tuition coverage applied</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Fee line items */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-4 rounded-full bg-violet-500" />
                        <h4 className="font-semibold text-sm text-slate-700">Fee Breakdown</h4>
                      </div>
                      <div className="rounded-xl border border-slate-100 overflow-hidden">
                        {[
                          ['Tuition', tuition],
                          ['Registration', enrollment?.registration || 0],
                          ['Library', enrollment?.library || 0],
                          ['Laboratory', enrollment?.lab || 0],
                          ['ID Fee', enrollment?.id_fee || 0],
                          ['Others', enrollment?.others || 0],
                        ].map(([label, val], i, arr) => (
                          <div key={label as string} className={`flex items-center justify-between px-4 py-2.5 text-sm ${i < arr.length - 1 ? 'border-b border-slate-100' : ''} ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                            <span className="text-slate-500">{label}</span>
                            <span className="font-medium text-slate-800">₱{Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Summary card */}
                    <div className="rounded-xl bg-slate-900 text-white p-4 space-y-2.5">
                      {totalUnits > 0 && (() => {
                        const perUnit = totalUnits > 0 ? Math.round(tuition / totalUnits) : 700;
                        return (
                          <div className="flex justify-between text-sm text-slate-400">
                            <span>Subject fees &nbsp;({totalUnits} units × ₱{perUnit.toLocaleString()})</span>
                            <span>₱{(totalUnits * perUnit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                        );
                      })()}
                      <div className="flex justify-between text-sm text-slate-400">
                        <span>Misc. fees</span>
                        <span>₱{miscTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {deduction > 0 && (
                        <div className="flex justify-between text-sm text-slate-900 font-medium">
                          <span>Scholarship deduction&nbsp;({covStr})</span>
                          <span>−₱{deduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="h-px bg-white/10" />
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-slate-400">Total Amount Due</span>
                        <span className="text-slate-900 font-bold text-2xl">₱{(enrollment?.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="shrink-0 flex justify-end px-6 py-4 border-t bg-slate-50">
            <Button variant="outline" onClick={() => setAdminEnrollOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderTransactionsContent = () => (
    <div>
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          <p className="text-slate-600 mb-6">View all enrollment and payment transactions.</p>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No transactions found</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-slate-900">{transaction.student}</h4>
                    {!transaction.hasReceipt && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        No Receipt
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {transaction.id} • {transaction.type} • {transaction.amount} • {transaction.date}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handlePreviewTransaction(transaction)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Badge className={`${
                    transaction.status === 'Approved' 
                      ? 'bg-green-100 text-green-700' 
                      : transaction.status === 'Rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                  } border-0`}>
                    {transaction.status}
                  </Badge>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderInstallmentPaymentsContent = () => (
    <div>
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          <p className="text-slate-600 mb-6">Monitor all installment payment submissions with proof of payment.</p>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : installmentPayments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No installment payments found</p>
          ) : (
            <div className="space-y-3">
              {installmentPayments.map((payment, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-slate-900">{payment.student}</h4>
                    <Badge className="text-xs bg-blue-100 text-blue-700 border-0">{payment.period}</Badge>
                    {!payment.hasReceipt && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        No Receipt
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {payment.id} • {payment.amount} • {payment.date}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedItem(payment);
                      setPreviewType('installment');
                      setPreviewOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Badge className={`${
                    payment.status === 'Approved' 
                      ? 'bg-green-100 text-green-700' 
                      : payment.status === 'Rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                  } border-0`}>
                    {payment.status}
                  </Badge>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderManageStudentsContent = () => (
    <div>
      <div className="flex items-center justify-end mb-6">
        <div className="flex gap-2">
          <Button 
            onClick={() => setAddStudentOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
            <Button
              onClick={handleExportStudents}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export Students
            </Button>
          <Button 
            onClick={() => setRemoveStudentOpen(true)}
            variant="outline"
            className="text-red-600 hover:bg-red-50 border-red-200 gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Remove Student
          </Button>
        </div>
      </div>
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No students found</p>
          ) : (
            <div className="space-y-3">
              {students.map((student, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-slate-900">{student.name}</h4>
                    <p className="text-sm text-slate-500">
                      {student.id} • {student.course} • {student.year} • {student.section}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleUpdateStudent(student)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Update Status
                  </Button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge className={student.corStatus === 'Updated' ? 'bg-green-100 text-green-700 border-0' : 'bg-orange-100 text-orange-700 border-0'}>
                    COR: {student.corStatus}
                  </Badge>
                  <Badge className={student.gradesComplete ? 'bg-green-100 text-green-700 border-0' : 'bg-orange-100 text-orange-700 border-0'}>
                    Grades: {student.gradesComplete ? 'Complete' : 'Incomplete'}
                  </Badge>
                  <Badge className={student.clearanceStatus === 'Clear' ? 'bg-green-100 text-green-700 border-0' : 'bg-orange-100 text-orange-700 border-0'}>
                    Clearance: {student.clearanceStatus}
                  </Badge>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderAccountRequestsContent = () => (
    <div>
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : accountRequests.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No pending account requests</p>
          ) : (
            <div className="space-y-3">
              {accountRequests.map((request, index) => (
                <div key={index} className="p-4 border rounded-lg hover:bg-slate-50">
                  <h4 className="text-slate-900 mb-2">{request.name}</h4>
                  <p className="text-sm text-slate-500 mb-3">
                    {request.id} • {request.studentType} • {request.email}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setViewingProfile(request);
                        setViewProfileOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      View Profile
                    </Button>
                    {request.status === 'Pending' && (
                      <>
                    <Button 
                      size="sm"
                      style={{ backgroundColor: '#16a34a', color: 'white' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                      className="gap-2"
                      onClick={() => {
                        setConfirmData({
                          title: 'Approve Account Request',
                          message: `Are you sure you want to approve the account request for ${request.name}?`,
                          onConfirm: async () => {
                            try {
                              setLoadingSection(`approve-${request.dbId}`);
                              await adminService.approveAccountRequest(request.dbId);
                              alert('Account request approved successfully');
                              await fetchDashboardData();
                            } catch (err: any) {
                              alert(err.message || 'Failed to approve request');
                            } finally {
                              setLoadingSection(null);
                            }
                          },
                          onCancel: () => {},
                          isLoading: loadingSection === `approve-${request.dbId}`
                        });
                        setConfirmOpen(true);
                      }}
                    >
                      <CheckIcon className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 border-red-200 gap-2"
                      onClick={() => {
                        setConfirmData({
                          title: 'Reject Account Request',
                          message: `Are you sure you want to reject the account request for ${request.name}?`,
                          onConfirm: async () => {
                            try {
                              setLoadingSection(`reject-${request.dbId}`);
                              await adminService.rejectAccountRequest(request.dbId);
                              alert('Account request rejected');
                              await fetchDashboardData();
                            } catch (err: any) {
                              alert(err.message || 'Failed to reject request');
                            } finally {
                              setLoadingSection(null);
                            }
                          },
                          onCancel: () => {},
                          isLoading: loadingSection === `reject-${request.dbId}`
                        });
                        setConfirmOpen(true);
                      }}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge className={`border-0 ${
                      request.status === 'Approved' 
                        ? 'bg-green-100 text-green-700'
                        : request.status === 'Rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      Status: {request.status || 'Pending'}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700 border-0">
                      Type: {request.studentType}
                    </Badge>
                    {request.course && request.course !== 'N/A' && (
                      <Badge className="bg-purple-100 text-purple-700 border-0">
                        {request.course}
                      </Badge>
                    )}
                  </div>
                  {request.contactNumber && request.contactNumber !== 'N/A' && (
                    <p className="text-xs text-slate-600 mt-2">Contact: {request.contactNumber}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderAuditTrailContent = () => {
    const loadAuditTrail = async () => {
      try {
        setAuditTrailLoading(true);
        const resp = await adminService.getAuditTrail({
          page: 1,
          limit: auditTrailLimit,
          search: auditTrailSearch
        });
        setAuditTrail(resp?.data || []);
        setAuditTrailTotal(resp?.meta?.total ?? null);
        setAuditTrailPage(1);
      } catch (err: any) {
        alert(err.message || 'Failed to load audit trail');
      } finally {
        setAuditTrailLoading(false);
      }
    };

    return (
      <div>
        <Card className="border-0 shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search audit trail..." 
                    className="pl-10"
                    value={auditTrailSearch}
                    onChange={(e) => setAuditTrailSearch(e.target.value)}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter') {
                        loadAuditTrail();
                      }
                    }}
                  />
                </div>
                <Button size="sm" onClick={loadAuditTrail}>Search</Button>
              </div>
            </div>

            {auditTrailLoading && auditTrail.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : auditTrail.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No audit trail entries found</p>
            ) : (
              <div className="space-y-3">
                {auditTrail.map((entry, index) => (
                  <div key={entry.id || index} className="p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-slate-900 font-medium">{entry.action}</h4>
                        <p className="text-sm text-slate-600 mt-1">{entry.description}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 border-0 ml-2 shrink-0">
                        {entry.role || 'Staff'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>User: {entry.username || 'System'}</span>
                      <span>{entry.entity_type && `Entity: ${entry.entity_type} #${entry.entity_id}`}</span>
                      <span>{new Date(entry.created_at + 'Z').toLocaleString('en-US', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit',
                        hour12: true
                      })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!auditTrailLoading && auditTrail.length > 0 && (
              <div className="p-3 flex items-center justify-center mt-4">
                {(auditTrailTotal === null || auditTrail.length < auditTrailTotal) ? (
                  <Button size="sm" onClick={async () => {
                    try {
                      setAuditTrailLoading(true);
                      const nextPage = auditTrailPage + 1;
                      const resp = await adminService.getAuditTrail({
                        page: nextPage,
                        limit: auditTrailLimit,
                        search: auditTrailSearch
                      });
                      setAuditTrail(prev => [...prev, ...(resp?.data || [])]);
                      setAuditTrailPage(nextPage);
                      setAuditTrailTotal(resp?.meta?.total ?? auditTrailTotal);
                    } catch (err: any) {
                      alert(err.message || 'Failed to load more entries');
                    } finally {
                      setAuditTrailLoading(false);
                    }
                  }}>Load more</Button>
                ) : (
                  <p className="text-xs text-slate-500">No more entries</p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderManageFacultyContent = () => {
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
          <div className="flex items-center justify-end mb-6">
          <div className="flex gap-2">
            <Button 
              onClick={() => setAddTeacherOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {`Add ${personSingular}`}
            </Button>
          </div>
        </div>
        <Card className="border-0 shadow-lg">
          <div className="p-6">
            {teachers.length === 0 ? (
              <p className="text-center text-slate-500 py-8">{`No ${personPlural.toLowerCase()} found`}</p>
            ) : (
              <div className="space-y-3">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-slate-900">{teacher.first_name} {teacher.last_name}</h4>
                        <p className="text-sm text-slate-500">{teacher.faculty_id} • {teacher.department || 'N/A'}</p>
                        {teacher.specialization && (
                          <p className="text-sm text-slate-600 mt-1">{teacher.specialization}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedStudent(teacher);
                            setEditTeacherForm({
                              faculty_id: teacher.faculty_id || '',
                              first_name: teacher.first_name || '',
                              middle_name: teacher.middle_name || '',
                              last_name: teacher.last_name || '',
                              suffix: teacher.suffix || '',
                              department: teacher.department || '',
                              specialization: teacher.specialization || '',
                              email: teacher.email || '',
                              contact_number: teacher.contact_number || '',
                              status: teacher.status || 'Active'
                            });
                            setEditTeacherOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setSelectedStudent(teacher);
                            setRemoveTeacherOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                    {teacher.email && (
                      <p className="text-xs text-slate-500">{teacher.email}</p>
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

  // Keep a teachers render alias so 'Teachers' page remains available and distinct label is used
  const renderManageTeachersContent = () => renderManageFacultyContent();

  const renderSHSGradesContent = () => {
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
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-600">View and manage SHS student grades.</p>
              <div className="flex items-center gap-3">
                <div>
                  <Label className="text-sm">School Year</Label>
                  <Select value={selectedSchoolYear} onValueChange={(v) => setSelectedSchoolYear(v)}>
                    <SelectTrigger className="w-40 mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolYears.map((s: any, i: number) => (
                        <SelectItem key={i} value={s.school_year || s}>{s.school_year || s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Semester</Label>
                  <Select value={selectedSemester} onValueChange={(v) => setSelectedSemester(v)}>
                    <SelectTrigger className="w-28 mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st">1st</SelectItem>
                      <SelectItem value="2nd">2nd</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {shsStudents.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No SHS students found</p>
            ) : (
              <div className="space-y-3">
                {shsStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex-1">
                      <h4 className="text-slate-900">{student.name}</h4>
                      <p className="text-sm text-slate-500">
                        {student.id} • {student.course} • {student.year}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={async () => {
                          try {
                            const gradesData = await gradesService.getStudentGrades(student.id, { subject_type: 'SHS', school_year: selectedSchoolYear, semester: selectedSemester });
                            const grades = gradesData?.data || gradesData || [];
                            setSelectedStudent({ ...student, grades });
                            setViewGradesOpen(true);
                          } catch (err: any) {
                            setError(err.message || 'Failed to load grades');
                          }
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Grades
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={async () => {
                          try {
                            // Fetch existing grades - student.id is now the string student_id
                            const gradesResp = await gradesService.getStudentGrades(student.id, { subject_type: 'SHS', school_year: selectedSchoolYear, semester: selectedSemester });
                            const existingGrades = gradesResp?.data || gradesResp || [];

                            // Fetch student details to locate latest enrollment
                            const stuResp = await adminService.getStudentById(student.dbId || student.studentId);
                            const stuData = stuResp?.data || stuResp || {};
                            const latestEnrollment = (stuData.enrollments || []).slice().reverse()[0];

                            let subjectsList: any[] = [];
                            if (latestEnrollment) {
                              const details = await enrollmentService.getEnrollmentDetails(latestEnrollment.id);
                              const enrollmentDetails = details?.data || details || {};
                              subjectsList = enrollmentDetails.enrollment_subjects || enrollmentDetails.subjects || [];
                            }

                            // Build grades list with proper enrollment_subject_id mapping
                            let gradesMerged: any[];
                            if (subjectsList.length > 0) {
                              gradesMerged = subjectsList.map((es: any) => {
                                const match = existingGrades.find((g: any) => g.id === es.id || g.subject_id === es.subject_id);
                                return {
                                  subject: es.subject_name || es.subject_code || match?.subject_name || '',
                                  grade: es.grade || match?.grade || '',
                                  enrollment_subject_id: es.id,
                                  subject_id: es.subject_id
                                };
                              });
                            } else if (existingGrades.length > 0) {
                              gradesMerged = existingGrades.map((g: any) => ({
                                subject: g.subject_name || g.subject_code || '',
                                grade: g.grade || '',
                                enrollment_subject_id: g.id,
                                subject_id: g.subject_id
                              }));
                            } else {
                              gradesMerged = [];
                            }

                            setSelectedStudent({ ...student, grades: gradesMerged });
                            setEditGradesOpen(true);
                          } catch (err: any) {
                            console.error('Failed to prepare edit grades:', err);
                            setError(err.message || 'Failed to load grades or enrolled subjects');
                          }
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
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

  const renderCollegeGradesContent = () => {
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
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-600">View and manage college student grades.</p>
              <div className="flex items-center gap-3">
                <div>
                  <Label className="text-sm">School Year</Label>
                  <Select value={selectedSchoolYear} onValueChange={(v) => setSelectedSchoolYear(v)}>
                    <SelectTrigger className="w-40 mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolYears.map((s: any, i: number) => (
                        <SelectItem key={i} value={s.school_year || s}>{s.school_year || s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Semester</Label>
                  <Select value={selectedSemester} onValueChange={(v) => setSelectedSemester(v)}>
                    <SelectTrigger className="w-28 mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st">1st</SelectItem>
                      <SelectItem value="2nd">2nd</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {collegeStudents.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No college students found</p>
            ) : (
              <div className="space-y-3">
                {collegeStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex-1">
                      <h4 className="text-slate-900">{student.name}</h4>
                      <p className="text-sm text-slate-500">
                        {student.id} • {student.course} • {student.year}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={async () => {
                          try {
                            const gradesData = await gradesService.getStudentGrades(student.id, { subject_type: 'College', school_year: selectedSchoolYear, semester: selectedSemester });
                            const grades = gradesData?.data || gradesData || [];
                            setSelectedStudent({ ...student, grades });
                            setViewGradesOpen(true);
                          } catch (err: any) {
                            setError(err.message || 'Failed to load grades');
                          }
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Grades
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={async () => {
                          try {
                            // Fetch available college subjects
                            const subjectsData = await maintenanceService.getAllSubjectsByType({ subject_type: 'College' });
                            if (subjectsData.success) {
                              setSubjects(subjectsData.data || []);
                            }

                            // student.id is the string student_id (e.g. "2024-00001"), student.dbId is the numeric DB id
                            const gradesResp = await gradesService.getStudentGrades(student.id, { subject_type: 'College' });
                            const existingGrades = gradesResp?.data || gradesResp || [];

                            const stuResp = await adminService.getStudentById(student.dbId || student.studentId);
                            const stuData = stuResp?.data || stuResp || {};
                            const latestEnrollment = (stuData.enrollments || []).slice().reverse()[0];

                            let subjectsList: any[] = [];
                            if (latestEnrollment) {
                              const details = await enrollmentService.getEnrollmentDetails(latestEnrollment.id);
                              const enrollmentDetails = details?.data || details || {};
                              subjectsList = enrollmentDetails.enrollment_subjects || enrollmentDetails.subjects || [];
                            }

                            // Build grades list: prefer enrollment subjects list, map enrollment_subject_id from es.id
                            let gradesMerged: any[];
                            if (subjectsList.length > 0) {
                              gradesMerged = subjectsList.map((es: any) => {
                                // existingGrades come from enrollment_subjects with es.* so id = enrollment_subject_id
                                const match = existingGrades.find((g: any) => g.id === es.id || g.subject_id === es.subject_id);
                                return {
                                  subject: es.subject_name || es.subject_code || match?.subject_name || '',
                                  grade: es.grade || match?.grade || '',
                                  enrollment_subject_id: es.id,
                                  subject_id: es.subject_id
                                };
                              });
                            } else if (existingGrades.length > 0) {
                              // Fallback: existingGrades from getStudentGrades returns es.* where es.id = enrollment_subject_id
                              gradesMerged = existingGrades.map((g: any) => ({
                                subject: g.subject_name || g.subject_code || '',
                                grade: g.grade || '',
                                enrollment_subject_id: g.id,
                                subject_id: g.subject_id
                              }));
                            } else {
                              gradesMerged = [];
                            }

                            setSelectedStudent({ ...student, grades: gradesMerged });
                            setEditGradesOpen(true);
                          } catch (err: any) {
                            console.error('Failed to prepare edit grades:', err);
                            setError(err.message || 'Failed to load grades or enrolled subjects');
                          }
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
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

  const renderSectionsContent = () => {
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
        <div className="flex items-center justify-end mb-6">
          <div className="flex gap-2">
            <Button 
              onClick={() => setAddSectionOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Section
            </Button>
          </div>
        </div>
        <Card className="border-0 shadow-lg">
          <div className="p-6">
            {sections.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No sections found</p>
            ) : (
              <div className="space-y-3">
                {sections.map((section) => (
                  <div key={section.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex-1">
                      <h4 className="text-slate-900">{section.section_name}</h4>
                      <p className="text-sm text-slate-500">
                        {section.section_code} • {section.course} • Year {section.year_level}
                        {section.adviser_name && ` • Adviser: ${section.adviser_name}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {section.current_enrollment || 0}/{section.capacity || 50} students • {section.school_year} • {section.semester}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingSection(section);
                          setEditSectionForm({
                            section_code: section.section_code || '',
                            section_name: section.section_name || '',
                            course: section.course || '',
                            year_level: section.year_level || 1,
                            school_year: section.school_year || '',
                            semester: section.semester || '1st',
                            capacity: section.capacity || 50,
                            adviser_id: section.adviser_id || 0
                          });
                          setEditSectionOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={async () => {
                          try {
                            await maintenanceService.deleteSection(section.id);
                            fetchDashboardData();
                          } catch (err: any) {
                            setError(err.message || 'Failed to delete section');
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
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

  const renderSubjectsContent = (type: 'SHS' | 'College') => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    const filteredSubjects = subjects.filter((s: any) => s.subject_type === type);

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
        <div className="flex items-center justify-end mb-6">
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                setSelectedStudent({ subject_type: type });
                setAddSubjectOpen(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
          </div>
        </div>
        <Card className="border-0 shadow-lg">
          <div className="p-6">
            <p className="text-slate-600 mb-4">Manage {type} subjects and curriculum.</p>
            {filteredSubjects.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No {type} subjects found</p>
            ) : (
              <div className="space-y-2">
                {filteredSubjects.map((subject) => (
                  <div key={subject.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">{subject.subject_code} - {subject.subject_name}</p>
                      <p className="text-xs text-slate-500">
                        {subject.units} units
                        {subject.course && ` • ${subject.course}`}
                        {subject.year_level && ` • Year ${subject.year_level}`}
                        {subject.semester && ` • ${subject.semester} Semester`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingSubject(subject);
                          setEditSubjectForm({
                            subject_code: subject.subject_code || '',
                            subject_name: subject.subject_name || '',
                            description: subject.description || '',
                            units: subject.units || 3,
                            course: subject.course || '',
                            year_level: subject.year_level || 1,
                            semester: subject.semester || '1st',
                            subject_type: subject.subject_type || type
                          });
                          setEditSubjectOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={async () => {
                          try {
                            await maintenanceService.deleteSubject(subject.id);
                            fetchDashboardData();
                          } catch (err: any) {
                            setError(err.message || 'Failed to delete subject');
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
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

  const renderSchoolYearContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    const activeSchoolYear = schoolYears.find((sy: any) => sy.is_active === 1);

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
        <div className="flex items-center justify-end mb-6">
          <Button 
            onClick={() => setAddSchoolYearOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add School Year
          </Button>
        </div>
        <Card className="border-0 shadow-lg p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="school-year">Active School Year</Label>
              {activeSchoolYear ? (
                <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="font-medium text-blue-900">{activeSchoolYear.school_year}</p>
                  <p className="text-sm text-blue-700 mt-1">
                    {activeSchoolYear.start_date} to {activeSchoolYear.end_date}
                  </p>
                  {activeSchoolYear.enrollment_start && (
                    <p className="text-xs text-blue-600 mt-1">
                      Enrollment: {activeSchoolYear.enrollment_start} to {activeSchoolYear.enrollment_end}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-2">No active school year set</p>
              )}
            </div>

            <div className="border-t pt-4 mt-6">
              <h4 className="mb-3">All School Years</h4>
              {schoolYears.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No school years found</p>
              ) : (
                <div className="space-y-4">
                  {schoolYears.map((sy: any) => (
                    <div key={sy.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-lg">{sy.school_year}</p>
                          <p className="text-sm text-slate-500">
                            {sy.start_date} to {sy.end_date}
                            {sy.is_active === 1 && (
                              <Badge className="ml-2 bg-green-100 text-green-700 border-0">Active</Badge>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingSchoolYear(sy);
                              setEditSchoolYearForm({
                                school_year: sy.school_year || '',
                                start_date: sy.start_date || '',
                                end_date: sy.end_date || '',
                                enrollment_start: sy.enrollment_start || '',
                                enrollment_end: sy.enrollment_end || '',
                                is_active: sy.is_active === 1
                              });
                              setEditSchoolYearOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                await maintenanceService.deleteSchoolYear(sy.id);
                                fetchDashboardData();
                              } catch (err: any) {
                                setError(err.message || 'Failed to delete school year');
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* Semester Management */}
                      <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200">
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-3">Semesters</p>
                          {(() => {
                            const semestersData = JSON.parse(localStorage.getItem('activeSemesterConfig') || '{}');
                            const activeSem = semestersData[sy.id] || '1st';
                            return (
                              <div className="space-y-2">
                                <p className="text-xs text-slate-600 mb-3">
                                  <Badge className="bg-green-100 text-green-700 border-0">Active Semester: {activeSem} Sem</Badge>
                                </p>
                                <div className="space-y-1">
                                  {['1st', '2nd', '3rd'].map((sem) => (
                                    <div key={sem} className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200">
                                      <input
                                        type="radio"
                                        name={`semester-${sy.id}`}
                                        value={sem}
                                        checked={activeSem === sem}
                                        onChange={(e) => {
                                          const data = JSON.parse(localStorage.getItem('activeSemesterConfig') || '{}');
                                          data[sy.id] = e.target.value;
                                          localStorage.setItem('activeSemesterConfig', JSON.stringify(data));
                                          setActiveSemesterConfig(e.target.value);
                                          fetchDashboardData();
                                        }}
                                        className="cursor-pointer"
                                      />
                                      <label className="flex-1 cursor-pointer text-sm">
                                        {sem} Semester
                                      </label>
                                      {activeSem === sem && (
                                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderManageFormsContent = () => {
    return (
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        {/* Header Card */}
        <Card className="border-0 shadow-md overflow-hidden bg-white">
          <div className="p-8 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600">
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-white text-2xl font-bold">Digital Forms Library</h2>
                <p className="text-blue-100 text-sm mt-1">Manage downloadable forms for students</p>
              </div>
              <div className="flex-shrink-0">
                <input 
                  style={{ display: 'none' }} 
                  type="file" 
                  id="formUpload" 
                  accept=".pdf,.doc,.docx,.xlsx,.xls"
                  disabled={templateUploading}
                  onChange={async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    try {
                      setTemplateUploading(true);
                      await adminService.uploadTemplate(file as any);
                      const list = await adminService.listTemplates();
                      setTemplates(list?.data || list || []);
                      (document.getElementById('formUpload') as HTMLInputElement).value = '';
                    } catch (err) {
                      console.error('Upload failed', err);
                      alert('Upload failed');
                    } finally {
                      setTemplateUploading(false);
                    }
                  }} 
                />
                <label 
                  htmlFor="formUpload" 
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-blue-600 font-medium text-sm rounded-lg cursor-pointer shadow-lg hover:shadow-xl hover:bg-opacity-95 transition-all whitespace-nowrap"
                >
                  {templateUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Upload Form
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Forms Grid */}
        {templates.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 shadow-none">
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="p-4 bg-slate-200 rounded-full mb-4">
                <FileText className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-slate-900 font-semibold text-lg mb-2">No forms yet</h3>
              <p className="text-slate-600 text-center max-w-md">
                Start building your forms library by uploading documents that students can access during enrollment.
              </p>
            </div>
          </Card>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-slate-900 font-semibold text-lg">
                  Forms Library
                  <span className="ml-2 inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {templates.length} {templates.length === 1 ? 'form' : 'forms'}
                  </span>
                </h3>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((form: any) => (
                <div 
                  key={form.name} 
                  className="group p-5 border border-slate-200 rounded-xl bg-white hover:shadow-lg hover:border-blue-300 transition-all duration-200 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2.5 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate text-sm" title={form.name}>
                        {form.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded font-medium">
                          {form.size ? ((form.size / 1024).toFixed(1) + ' KB') : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-slate-200 via-slate-300 to-transparent mb-4"></div>

                  {/* Card Details */}
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="inline-block w-1 h-1 bg-slate-400 rounded-full"></span>
                      {form.mtime ? new Date(form.mtime).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Unknown date'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(form.url, '_blank')}
                      className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 group-hover:border-blue-300"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Delete "${form.name}"?`)) return;
                        try {
                          await adminService.deleteTemplate(form.name);
                          setTemplates(prev => prev.filter(p => p.name !== form.name));
                        } catch (err) {
                          console.error('Delete failed', err);
                          alert('Delete failed');
                        }
                      }}
                      className="px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStudentDocumentsContent = () => {
    // Fetch documents when enrollment is selected
    const handleSelectEnrollment = async (enrollment: any) => {
      setSDSelectedEnrollment(enrollment);
      try {
        setSDLoading(true);
        const response = await studentService.getEnrollmentDocuments(enrollment.id);
        setSDDocuments(response?.data || []);
      } catch (err) {
        console.error('Failed to load documents:', err);
        setSDDocuments([]);
      } finally {
        setSDLoading(false);
      }
    };

    // Get document status
    const getDocumentStatus = (docType: string) => {
      const doc = sdDocuments.find(d => d.document_type === docType);
      if (!doc) return { status: 'missing', label: 'Missing', color: 'text-red-600', bg: 'bg-red-50' };
      if (doc.status === 'marked_to_follow') return { status: 'to_follow', label: 'Marked to Follow', color: 'text-amber-600', bg: 'bg-amber-50' };
      return { status: 'submitted', label: 'Submitted', color: 'text-green-600', bg: 'bg-green-50' };
    };

    const filteredEnrollments = sdEnrollments.filter(e =>
      !sdSearchStudent || 
      e.student_id?.toString().includes(sdSearchStudent) ||
      e.student_name?.toLowerCase().includes(sdSearchStudent.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student List */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-md sticky top-4">
              <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="font-semibold text-slate-900 text-sm mb-3">Search Students</h3>
                <Input 
                  placeholder="Student ID or Name"
                  value={sdSearchStudent}
                  onChange={(e) => setSDSearchStudent(e.target.value)}
                  className="bg-white"
                />
              </div>
              <ScrollArea className="h-[500px]">
                <div className="divide-y divide-slate-200">
                  {filteredEnrollments.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      {sdLoading ? 'Loading...' : 'No enrollments found'}
                    </div>
                  ) : (
                    filteredEnrollments.map((enrollment) => (
                      <button
                        key={enrollment.id}
                        onClick={() => handleSelectEnrollment(enrollment)}
                        className={`w-full p-3 text-left transition-colors ${
                          sdSelectedEnrollment?.id === enrollment.id 
                            ? 'bg-blue-50 border-l-4 border-blue-600' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <p className="font-medium text-sm text-slate-900">{enrollment.student_name}</p>
                        <p className="text-xs text-slate-600 mt-1">ID: {enrollment.student_id}</p>
                        <p className="text-xs text-slate-500 mt-1">{enrollment.course_name} - {enrollment.year_level}</p>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Documents View */}
          <div className="lg:col-span-2">
            {!sdSelectedEnrollment ? (
              <Card className="border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <FileText className="h-16 w-16 text-slate-300 mb-4" />
                  <h3 className="text-slate-900 font-semibold text-lg mb-2">Select a Student</h3>
                  <p className="text-slate-600 text-center">Choose a student from the list to view their document submissions</p>
                </div>
              </Card>
            ) : (
              <Card className="border-0 shadow-md">
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h3 className="font-semibold text-slate-900 text-lg">{sdSelectedEnrollment.student_name}</h3>
                  <p className="text-sm text-slate-600 mt-1">Student ID: {sdSelectedEnrollment.student_id} | {sdSelectedEnrollment.course_name}</p>
                </div>

                {sdLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                    <p className="text-slate-600 mt-2">Loading documents...</p>
                  </div>
                ) : sdDocuments.length === 0 ? (
                  <div className="p-8 text-center text-slate-600">
                    <AlertCircle className="h-8 w-8 mx-auto text-amber-600 mb-2" />
                    <p>No documents found for this enrollment</p>
                  </div>
                ) : (
                  <div className="p-6 space-y-3">
                    {sdDocuments.map((doc) => {
                      const statusInfo = getDocumentStatus(doc.document_type);
                      return (
                        <div key={doc.id} className={`p-4 border border-slate-200 rounded-lg flex items-center justify-between ${statusInfo.bg}`}>
                          <div className="flex items-center gap-4 flex-1">
                            <FileText className={`h-5 w-5 ${statusInfo.color}`} />
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{doc.document_type.replace(/_/g, ' ').toUpperCase()}</p>
                              <p className="text-xs text-slate-600">{doc.file_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={`${statusInfo.color} border-current bg-transparent`}>
                              {statusInfo.label}
                            </Badge>
                            {doc.file_path && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(doc.file_path, '_blank')}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
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
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-slate-900">IC Northgate</h3>
                <p className="text-sm text-slate-500">Admin Portal</p>
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
              onClick={() => setActiveSection('Enrollment Request')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Enrollment Request' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="h-5 w-5" />
              Enrollments
            </button>
            
            <button
              onClick={() => setActiveSection('Account Requests')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Account Requests' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <UserPlus className="h-5 w-5" />
              Account Requests
            </button>

            <button
              onClick={() => setActiveSection('Audit Trail')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Audit Trail' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Clock className="h-5 w-5" />
              Audit Trail
            </button>

            {/* Faculty moved into Manage submenu; no top-level Faculty button */}

            <div className="pt-4">
              {/* Manage Collapsible */}
              <Collapsible open={manageOpen} onOpenChange={setManageOpen}>
                <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all text-slate-700 hover:bg-slate-100">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5" />
                    <span>Manage</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${manageOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 ml-4 space-y-1">
                  <button 
                    onClick={() => setActiveSection('Manage Students')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Students
                  </button>
                  <button 
                    onClick={() => setActiveSection('Manage Teachers')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Teachers
                  </button>
                  <button 
                    onClick={() => setActiveSection('College Grades')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    College Grades
                  </button>
                  <button 
                    onClick={() => setActiveSection('Manage Forms')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Forms
                  </button>
                  <button 
                    onClick={() => setActiveSection('Student Documents')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Student Documents
                  </button>
                </CollapsibleContent>
              </Collapsible>

              {/* Maintenance Collapsible - STEM button removed */}
              <Collapsible open={maintenanceOpen} onOpenChange={setMaintenanceOpen}>
                <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all text-slate-700 hover:bg-slate-100">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5" />
                    <span>Maintenance</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${maintenanceOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 ml-4 space-y-1">
                  <button 
                    onClick={() => setActiveSection('Sections')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Sections
                  </button>
                  <button 
                    onClick={() => setActiveSection('College Subjects')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    College Subjects
                  </button>
                  <button 
                    onClick={() => setActiveSection('School Year')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    School Year and Semesters
                  </button>
                </CollapsibleContent>
              </Collapsible>
            </div>
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
                  {activeSection === 'Dashboard' && 'Admin Dashboard'}
                  {activeSection === 'Enrollment Request' && 'Enrollments'}
                  {activeSection === 'Manage Students' && 'Manage Students'}
                  {activeSection === 'Manage Teachers' && 'Manage Teachers'}
                  {activeSection === 'Manage Faculty' && 'Manage Faculty'}
                  {activeSection === 'SHS Grades' && 'SHS Grades'}
                  {activeSection === 'College Grades' && 'College Grades'}
                  {activeSection === 'Sections' && 'Sections'}
                  {activeSection === 'SHS Subjects' && 'SHS Subjects'}
                  {activeSection === 'College Subjects' && 'College Subjects'}
                  {activeSection === 'School Year' && 'School Year and Semesters'}
                  {activeSection === 'Account Requests' && 'Account Requests'}
                  {activeSection === 'Audit Trail' && 'Audit Trail'}
                  {activeSection === 'Transactions' && 'Transactions'}
                  {activeSection === 'Installment Payments' && 'Installment Payments'}
                  {activeSection === 'Manage Forms' && 'Digital Forms Library'}
                  {activeSection === 'Student Documents' && 'Student Document Submissions'}
                </h1>
                <p className="text-sm text-slate-600">
                  {activeSection === 'Dashboard' && 'Welcome back to your administration portal'}
                  {activeSection === 'Enrollment Request' && 'Review and manage all student enrollment submissions'}
                  {activeSection === 'Account Requests' && 'Approve or reject pending student account requests'}
                  {activeSection === 'Audit Trail' && 'View all modifications made by non-student roles'}
                  {activeSection === 'Manage Students' && 'Add, update, and manage student records'}
                  {activeSection === 'Manage Teachers' && 'Manage teacher/faculty accounts and information'}
                  {activeSection === 'Manage Faculty' && 'Manage faculty accounts and information'}
                  {activeSection === 'SHS Grades' && 'View and edit SHS student grades'}
                  {activeSection === 'College Grades' && 'View and edit college student grades'}
                  {activeSection === 'Sections' && 'Create and manage class sections'}
                  {activeSection === 'SHS Subjects' && 'Manage SHS curriculum subjects'}
                  {activeSection === 'College Subjects' && 'Manage college curriculum subjects'}
                  {activeSection === 'School Year' && 'Configure school years and active semesters'}
                  {activeSection === 'Transactions' && 'Monitor all enrollment and payment transactions'}
                  {activeSection === 'Installment Payments' && 'Track installment payment submissions and verification'}
                  {activeSection === 'Manage Forms' && 'Upload and manage downloadable forms for students'}
                  {activeSection === 'Student Documents' && 'Review student document submissions and track submission status'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-slate-600">Admin User</p>
                  <p className="text-xs text-slate-500">admin@icnorthgate.edu</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {/* Dynamic Content */}
            {activeSection === 'Dashboard' && renderDashboardContent()}
            {activeSection === 'Enrollment Request' && renderEnrollmentRequestsContent()}
            {activeSection === 'Account Requests' && renderAccountRequestsContent()}
            {activeSection === 'Audit Trail' && renderAuditTrailContent()}
            {activeSection === 'Manage Students' && renderManageStudentsContent()}
            {activeSection === 'Manage Teachers' && renderManageFacultyContent()}
            {activeSection === 'Manage Faculty' && renderManageFacultyContent()}
            {activeSection === 'SHS Grades' && renderSHSGradesContent()}
            {activeSection === 'College Grades' && renderCollegeGradesContent()}
            {activeSection === 'Sections' && renderSectionsContent()}
            {activeSection === 'SHS Subjects' && renderSubjectsContent('SHS')}
            {activeSection === 'College Subjects' && renderSubjectsContent('College')}
            {activeSection === 'School Year' && renderSchoolYearContent()}
            {activeSection === 'Manage Forms' && renderManageFormsContent()}
            {activeSection === 'Student Documents' && renderStudentDocumentsContent()}
          </div>
        </div>

        {/* View Account Profile Dialog */}
      <Dialog open={viewProfileOpen} onOpenChange={setViewProfileOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Profile</DialogTitle>
          </DialogHeader>
          {viewingProfile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">First Name</Label>
                  <p className="mt-1 text-sm">{viewingProfile.first_name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Last Name</Label>
                  <p className="mt-1 text-sm">{viewingProfile.last_name || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Student No.</Label>
                  <p className="mt-1 text-sm">{viewingProfile.id}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Email</Label>
                  <p className="mt-1 text-sm">{viewingProfile.email || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Contact Number</Label>
                  <p className="mt-1 text-sm">{viewingProfile.contactNumber || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Student Type</Label>
                  <p className="mt-1 text-sm">{viewingProfile.studentType}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Course</Label>
                  <p className="mt-1 text-sm">{viewingProfile.course || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Year Level</Label>
                  <p className="mt-1 text-sm">{viewingProfile.year || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setViewProfileOpen(false)}>Close</Button>
            <Button 
              className="gap-2"
              onClick={() => {
                setViewProfileOpen(false);
                setEditingAccountRequest(viewingProfile);
                setEditAccountForm({ student_id: viewingProfile.id });
                setEditAccountOpen(true);
              }}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Student ID Dialog */}
      <Dialog open={editAccountOpen} onOpenChange={setEditAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student No.</DialogTitle>
          </DialogHeader>
          {editingAccountRequest && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                setLoadingSection('edit-account');
                // Update the student record with new student_id and username
                await adminService.updateStudent(editingAccountRequest.dbId, {
                  student_id: editAccountForm.student_id,
                  username: editAccountForm.student_id
                });
                alert('Student number and login updated successfully');
                setEditAccountOpen(false);
                await fetchDashboardData();
              } catch (err: any) {
                alert(err.message || 'Failed to update student number');
              } finally {
                setLoadingSection(null);
              }
            }} className="space-y-4">
              <div>
                <Label htmlFor="edit-student-id">Student No.</Label>
                <Input
                  id="edit-student-id"
                  value={editAccountForm.student_id}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, student_id: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditAccountOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loadingSection === 'edit-account'}>
                  {loadingSection === 'edit-account' ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  type="button"
                  style={{ backgroundColor: '#16a34a', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                  disabled={loadingSection === 'approve-account'}
                  onClick={async () => {
                    try {
                      setLoadingSection('approve-account');
                      // First update student_id and username
                      await adminService.updateStudent(editingAccountRequest.dbId, {
                        student_id: editAccountForm.student_id,
                        username: editAccountForm.student_id
                      });
                      // Then approve the account
                      await adminService.approveAccountRequest(editingAccountRequest.dbId);
                      alert('Student number updated and account approved successfully');
                      setEditAccountOpen(false);
                      await fetchDashboardData();
                    } catch (err: any) {
                      alert(err.message || 'Failed to update and approve');
                    } finally {
                      setLoadingSection(null);
                    }
                  }}
                >
                  {loadingSection === 'approve-account' ? 'Approving...' : 'Save & Approve'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmData.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmData.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setConfirmOpen(false);
                confirmData.onCancel?.();
              }}
              disabled={confirmData.isLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                await confirmData.onConfirm?.();
                setConfirmOpen(false);
              }}
              disabled={confirmData.isLoading}
              style={{ backgroundColor: '#2563eb', color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            >
              {confirmData.isLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <DialogTitle>
                  {previewType === 'student' ? 'Student Enrollment Preview' : previewType === 'installment' ? 'Installment Payment Preview' : 'Transaction Preview'}
                </DialogTitle>
                <DialogDescription>
                  {previewType === 'student' 
                    ? 'Review student information and uploaded documents'
                    : previewType === 'installment'
                    ? 'Review installment payment details and proof of payment'
                    : 'Review transaction details and payment receipt'}
                </DialogDescription>
              </div>
              {previewType === 'transaction' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setPreviewOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {previewType === 'student' && selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Student Name</p>
                  <p className="font-medium">{selectedItem.enrollment?.first_name || selectedItem.enrollment?.first_name || `${selectedItem.enrollment?.first_name || ''} ${selectedItem.enrollment?.last_name || ''}`.trim() || `${selectedItem.enrollment?.first_name || ''} ${selectedItem.enrollment?.last_name || ''}`.trim()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Student ID</p>
                  <p className="font-medium">{selectedItem.enrollment?.student_id || selectedItem.enrollment?.id || selectedItem.enrollment?.student_id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Course</p>
                  <p className="font-medium">{selectedItem.enrollment?.course || selectedItem.enrollment?.course}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Student Type</p>
                  <p className="font-medium">{selectedItem.enrollment?.student_type || selectedItem.enrollment?.student_type}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="mb-3">Uploaded Documents</h4>
                <div className="space-y-2">
                  {selectedItem.documents && selectedItem.documents.length > 0 ? (
                    selectedItem.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">{doc.document_type || doc.file_name}</span>
                        </div>
                        <a href={doc.file_path} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline">View</Button>
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 italic">No documents uploaded yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {previewType === 'transaction' && selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Transaction ID</p>
                  <p className="font-medium">{selectedItem.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Student Name</p>
                  <p className="font-medium">{selectedItem.student}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Transaction Type</p>
                  <p className="font-medium">{selectedItem.type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="font-medium">{selectedItem.amount}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{selectedItem.date}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className={`${
                    selectedItem.status === 'Approved' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-orange-100 text-orange-700'
                  } border-0`}>
                    {selectedItem.status}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="mb-3">Proof of Payment</h4>
                {selectedItem?.receipt_path ? (
                  <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center bg-green-50">
                    <FileText className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-sm text-green-700 mb-3">Receipt uploaded</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-100"
                      onClick={() => {
                        const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000';
                        const receiptUrl = selectedItem.receipt_path.startsWith('http') 
                          ? selectedItem.receipt_path 
                          : selectedItem.receipt_path.startsWith('/') 
                            ? `${baseUrl}${selectedItem.receipt_path}`
                            : `${baseUrl}/${selectedItem.receipt_path}`;
                        
                        const link = document.createElement('a');
                        link.href = receiptUrl;
                        link.download = selectedItem.receipt_path.split('/').pop() || 'receipt';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Receipt
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center bg-orange-50">
                    <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                    <p className="text-sm text-orange-600">No receipt uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {previewType === 'installment' && selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Payment ID</p>
                  <p className="font-medium">{selectedItem.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Student Name</p>
                  <p className="font-medium">{selectedItem.student}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Period</p>
                  <p className="font-medium">{selectedItem.period}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="font-medium">{selectedItem.amount}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{selectedItem.date}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className={`${
                    selectedItem.status === 'Approved' 
                      ? 'bg-green-100 text-green-700' 
                      : selectedItem.status === 'Rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                  } border-0`}>
                    {selectedItem.status}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="mb-3">Proof of Payment</h4>
                {selectedItem?.receipt_path ? (
                  <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center bg-green-50">
                    <FileText className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-sm text-green-700 mb-3">Receipt uploaded</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-100"
                      onClick={() => {
                        const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000';
                        const receiptUrl = selectedItem.receipt_path.startsWith('http') 
                          ? selectedItem.receipt_path 
                          : selectedItem.receipt_path.startsWith('/') 
                            ? `${baseUrl}${selectedItem.receipt_path}`
                            : `${baseUrl}/${selectedItem.receipt_path}`;
                        
                        const link = document.createElement('a');
                        link.href = receiptUrl;
                        link.download = selectedItem.receipt_path.split('/').pop() || 'receipt';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Receipt
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center bg-orange-50">
                    <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                    <p className="text-sm text-orange-600">No receipt uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Grades Dialog */}
      <Dialog open={viewGradesOpen} onOpenChange={setViewGradesOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Grades</DialogTitle>
            <DialogDescription>
              View detailed grades for {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-slate-500">Student Name</p>
                  <p className="font-medium">{selectedStudent.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Student ID</p>
                  <p className="font-medium">{selectedStudent.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{selectedStudent.course ? 'Course' : 'Strand'}</p>
                  <p className="font-medium">{selectedStudent.course || selectedStudent.strand}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">GPA</p>
                  <p className="font-medium">{selectedStudent.gpa}</p>
                </div>
              </div>

              <div>
                <h4 className="mb-3">Grades</h4>
                <div className="space-y-2">
                  {selectedStudent.grades?.map((grade: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{grade.subject_code || grade.subject}</p>
                        <p className="text-xs text-slate-500">{grade.subject_name || grade.subject}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 border-0 ml-2">
                        {grade.grade || 'N/A'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Grades Dialog */}
      <Dialog open={editGradesOpen} onOpenChange={setEditGradesOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student Grades & Subjects</DialogTitle>
            <DialogDescription>
              Edit grades and enrolled subjects for {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-slate-500">Student Name</p>
                  <p className="font-medium">{selectedStudent.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Student ID</p>
                  <p className="font-medium">{selectedStudent.id}</p>
                </div>
              </div>

              <div>
                <h4 className="mb-3">Edit Grades & Subjects</h4>
                <div className="space-y-3">
                  {(selectedStudent.grades || []).map((grade: any, index: number) => {
                    // Filter available subjects based on student's course
                    const availableSubjects = subjects.filter((s: any) => {
                      // If subject is not assigned a specific course, it's a general subject
                      if (!s.course) return true;
                      // Otherwise, match by course
                      return s.course === selectedStudent.course;
                    });

                    // Show a warning if this grade entry doesn't have an enrollment_subject_id
                    const hasValidId = grade.enrollment_subject_id || grade.enrollment_subject_id === 0;
                    
                    return (
                      <div key={index} className="flex items-center gap-3">
                        {!hasValidId && (
                          <div className="text-xs text-orange-600 italic">(New Subject)</div>
                        )}
                        <Select 
                          value={grade.subject_id?.toString() || ''} 
                          onValueChange={(value) => {
                            const selectedSubject = availableSubjects.find(s => s.id.toString() === value);
                            handleUpdateGradeField(index, 'subject', selectedSubject?.subject_name || '');
                            handleUpdateGradeField(index, 'subject_id', selectedSubject?.id || null);
                            // Important: keep the enrollment_subject_id unchanged - it's needed for the API
                            // Only update it if we're adding a new subject (no enrollment_subject_id yet)
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSubjects.length === 0 ? (
                              <div className="p-2 text-sm text-slate-500">No subjects available</div>
                            ) : (
                              availableSubjects.map((subject: any) => (
                                <SelectItem key={subject.id} value={subject.id.toString()}>
                                  {subject.subject_code} - {subject.subject_name} ({subject.units}u)
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Input 
                          value={grade.grade ?? ''} 
                          className="w-24"
                          placeholder="Grade"
                          type="number"
                          step="0.25"
                          min="1"
                          max="5"
                          onChange={(e) => handleUpdateGradeField(index, 'grade', e.target.value)}
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveSubject(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => {
                  if (!selectedStudent) return;
                  const grades = Array.isArray(selectedStudent.grades) ? [...selectedStudent.grades] : [];
                  grades.push({ subject: '', grade: '', enrollment_subject_id: null, subject_id: null });
                  setSelectedStudent({ ...selectedStudent, grades });
                }}>
                  <Plus className="h-4 w-4" />
                  Add Subject
                </Button>
              </div>

              <div className="flex gap-2 justify-end border-t pt-4">
                <Button variant="outline" onClick={() => setEditGradesOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  onClick={handleSaveGrades}
                  disabled={loadingSection === 'save-grades'}
                >
                  {loadingSection === 'save-grades' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Student Status Dialog */}
      <Dialog open={updateStudentOpen} onOpenChange={setUpdateStudentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>View Student Details</DialogTitle>
            <DialogDescription>
              Personal information for {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input 
                  className="mt-2"
                  value={selectedStudent?.name || ''}
                  onChange={(e) => setSelectedStudent({...selectedStudent, name: e.target.value})}
                />
              </div>

              <div>
                <Label>Student ID</Label>
                <div className="mt-2 p-2 bg-slate-50 rounded border">{selectedStudent?.id || 'N/A'}</div>
              </div>

              <div>
                <Label>Email</Label>
                <Input 
                  className="mt-2"
                  type="email"
                  value={selectedStudent?.email || ''}
                  onChange={(e) => setSelectedStudent({...selectedStudent, email: e.target.value})}
                />
              </div>

              <div>
                <Label>Contact Number</Label>
                <Input 
                  className="mt-2"
                  value={selectedStudent?.contactNumber || selectedStudent?.contact_number || ''}
                  onChange={(e) => setSelectedStudent({...selectedStudent, contactNumber: e.target.value, contact_number: e.target.value})}
                />
              </div>

              <div>
                <Label>Course</Label>
                <Select 
                  value={selectedStudent?.course || undefined}
                  onValueChange={(value) => setSelectedStudent({...selectedStudent, course: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course: any) => {
                      const code = course.program_code || course.name || '';
                      const name = course.program_name || course.name || code;
                      const label = code && name && code !== name ? `${code} — ${name}` : (name || code);
                      return (
                        <SelectItem key={course.id || code} value={code}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Year Level</Label>
                <Select 
                  value={selectedStudent?.year?.toString() || ''}
                  onValueChange={(value) => setSelectedStudent({...selectedStudent, year: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select year level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Student Type</Label>
                <Select 
                  value={selectedStudent?.studentType || ''}
                  onValueChange={(value) => setSelectedStudent({...selectedStudent, studentType: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select student type" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Class Section</Label>
                <Select 
                  value={selectedStudent?.section && selectedStudent.section !== 'N/A' ? selectedStudent.section : undefined}
                  onValueChange={(value) => setSelectedStudent({...selectedStudent, section: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Section 1</SelectItem>
                    <SelectItem value="2">Section 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end border-t pt-4">
                <Button variant="outline" onClick={() => setUpdateStudentOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  onClick={async () => {
                    try {
                      setLoadingSection('update-student-details');
                      // Use the numeric database ID for the update (studentId or dbId)
                      const studentId = selectedStudent?.studentId || selectedStudent?.dbId;
                      if (!studentId) {
                        alert('Student ID not found');
                        return;
                      }
                      await adminService.updateStudent(studentId, {
                        first_name: selectedStudent?.first_name || selectedStudent?.name?.split(' ')[0],
                        last_name: selectedStudent?.last_name || selectedStudent?.name?.split(' ')[1] || '',
                        email: selectedStudent?.email,
                        contact_number: selectedStudent?.contactNumber || selectedStudent?.contact_number,
                        course: selectedStudent?.course,
                        year_level: parseInt(selectedStudent?.year) || 1,
                        student_type: selectedStudent?.studentType,
                        section: selectedStudent?.section !== 'N/A' ? selectedStudent?.section : null,
                        username: selectedStudent?.id || selectedStudent?.student_id
                      });
                      alert('Student details updated successfully');
                      // Clear selected student and close dialog
                      setSelectedStudent(null);
                      setUpdateStudentOpen(false);
                      // Refresh dashboard data to reflect changes throughout the system
                      await fetchDashboardData();
                    } catch (err: any) {
                      alert(err.message || 'Failed to update student details');
                    } finally {
                      setLoadingSection(null);
                    }
                  }}
                  disabled={loadingSection === 'update-student-details'}
                >
                  {loadingSection === 'update-student-details' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Other dialogs continue from previous implementation... */}
      {/* Add Section Dialog */}
      <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Create a new section for students
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="section-code">Section Code</Label>
                <Input 
                  id="section-code" 
                  placeholder="e.g., IT-1A" 
                  className="mt-2"
                  value={newSectionForm.section_code}
                  onChange={(e) => setNewSectionForm({ ...newSectionForm, section_code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="section-name">Section Name</Label>
                <Input 
                  id="section-name" 
                  placeholder="e.g., IT-1A" 
                  className="mt-2"
                  value={newSectionForm.section_name}
                  onChange={(e) => setNewSectionForm({ ...newSectionForm, section_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="section-course">Course/Program</Label>
                <Input 
                  id="section-course" 
                  placeholder="e.g., BSIT" 
                  className="mt-2"
                  value={newSectionForm.course}
                  onChange={(e) => setNewSectionForm({ ...newSectionForm, course: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="section-year">Year Level</Label>
                <Input 
                  id="section-year" 
                  type="number"
                  min="1"
                  max="4"
                  placeholder="1" 
                  className="mt-2"
                  value={newSectionForm.year_level}
                  onChange={(e) => setNewSectionForm({ ...newSectionForm, year_level: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="section-school-year">School Year</Label>
                <Input 
                  id="section-school-year" 
                  placeholder="2024-2025" 
                  className="mt-2"
                  value={newSectionForm.school_year}
                  onChange={(e) => setNewSectionForm({ ...newSectionForm, school_year: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="section-semester">Semester</Label>
                <Select
                  value={newSectionForm.semester}
                  onValueChange={(value) => setNewSectionForm({ ...newSectionForm, semester: value })}
                >
                  <SelectTrigger id="section-semester" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Semester</SelectItem>
                    <SelectItem value="2nd">2nd Semester</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="section-capacity">Capacity</Label>
              <Input 
                id="section-capacity" 
                type="number"
                placeholder="50" 
                className="mt-2"
                value={newSectionForm.capacity}
                onChange={(e) => setNewSectionForm({ ...newSectionForm, capacity: parseInt(e.target.value) || 50 })}
              />
            </div>
            <div>
              <Label htmlFor="section-adviser">Adviser (Optional)</Label>
              <Select
                value={newSectionForm.adviser_id.toString()}
                onValueChange={(value) => setNewSectionForm({ ...newSectionForm, adviser_id: parseInt(value) || 0 })}
              >
                <SelectTrigger id="section-adviser" className="mt-2">
                  <SelectValue placeholder="Select adviser (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.first_name} {teacher.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setAddSectionOpen(false);
                setNewSectionForm({
                  section_code: '',
                  section_name: '',
                  course: '',
                  year_level: 1,
                  school_year: '',
                  semester: '1st',
                  capacity: 50,
                  adviser_id: 0
                });
              }}>
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={() => handleCreateSection(newSectionForm)}
                disabled={loadingSection === 'create-section'}
              >
                {loadingSection === 'create-section' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Section'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add School Year Dialog */}
      <Dialog open={addSchoolYearOpen} onOpenChange={setAddSchoolYearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add School Year</DialogTitle>
            <DialogDescription>
              Create a new school year
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sy-year">School Year</Label>
              <Input 
                id="sy-year" 
                placeholder="2024-2025" 
                className="mt-2"
                value={newSchoolYearForm.school_year}
                onChange={(e) => setNewSchoolYearForm({ ...newSchoolYearForm, school_year: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sy-start">Start Date</Label>
                <Input 
                  id="sy-start" 
                  type="date"
                  className="mt-2"
                  value={newSchoolYearForm.start_date}
                  onChange={(e) => setNewSchoolYearForm({ ...newSchoolYearForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sy-end">End Date</Label>
                <Input 
                  id="sy-end" 
                  type="date"
                  className="mt-2"
                  value={newSchoolYearForm.end_date}
                  onChange={(e) => setNewSchoolYearForm({ ...newSchoolYearForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sy-enroll-start">Enrollment Start</Label>
                <Input 
                  id="sy-enroll-start" 
                  type="date"
                  className="mt-2"
                  value={newSchoolYearForm.enrollment_start}
                  onChange={(e) => setNewSchoolYearForm({ ...newSchoolYearForm, enrollment_start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sy-enroll-end">Enrollment End</Label>
                <Input 
                  id="sy-enroll-end" 
                  type="date"
                  className="mt-2"
                  value={newSchoolYearForm.enrollment_end}
                  onChange={(e) => setNewSchoolYearForm({ ...newSchoolYearForm, enrollment_end: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="sy-active" 
                checked={newSchoolYearForm.is_active}
                onCheckedChange={(checked) => setNewSchoolYearForm({ ...newSchoolYearForm, is_active: checked === true })}
              />
              <Label htmlFor="sy-active" className="cursor-pointer">
                Set as active school year
              </Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setAddSchoolYearOpen(false);
                setNewSchoolYearForm({
                  school_year: '',
                  start_date: '',
                  end_date: '',
                  enrollment_start: '',
                  enrollment_end: '',
                  is_active: false
                });
              }}>
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={() => handleCreateSchoolYear(newSchoolYearForm)}
                disabled={loadingSection === 'create-school-year'}
              >
                {loadingSection === 'create-school-year' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add School Year'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Semesters Dialog */}
      <Dialog open={selectedSchoolYearForSemester !== null} onOpenChange={(open) => {
        if (!open) setSelectedSchoolYearForSemester(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Semesters</DialogTitle>
            <DialogDescription>
              Select semesters for {selectedSchoolYearForSemester?.school_year}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Choose which semesters are available for this school year:
            </p>
            <div className="space-y-2">
              {semesters.map((sem) => (
                <div key={sem} className="flex items-center gap-2">
                  <Checkbox
                    id={`sem-${sem}`}
                    checked={activeSemestersInSY.includes(sem)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setActiveSemestersInSY([...activeSemestersInSY, sem]);
                      } else {
                        setActiveSemestersInSY(activeSemestersInSY.filter(s => s !== sem));
                      }
                    }}
                  />
                  <Label htmlFor={`sem-${sem}`} className="cursor-pointer font-normal">
                    {sem} Semester
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setSelectedSchoolYearForSemester(null)}
              >
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={async () => {
                  try {
                    setLoadingSection('configure-semesters');
                    
                    // Store semesters in localStorage keyed by school year ID
                    const semestersData = JSON.parse(localStorage.getItem('schoolYearSemesters') || '{}');
                    semestersData[selectedSchoolYearForSemester.id] = activeSemestersInSY;
                    localStorage.setItem('schoolYearSemesters', JSON.stringify(semestersData));
                    
                    alert(`Semesters configured for ${selectedSchoolYearForSemester.school_year}: ${activeSemestersInSY.join(', ') || 'None'}`);
                    
                    // Close dialog and refresh to show updated semester info
                    setSelectedSchoolYearForSemester(null);
                    setActiveSemestersInSY([]);
                    await fetchDashboardData();
                  } catch (err: any) {
                    alert(err.message || 'Failed to configure semesters');
                  } finally {
                    setLoadingSection(null);
                  }
                }}
                disabled={loadingSection === 'configure-semesters'}
              >
                {loadingSection === 'configure-semesters' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Semesters'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Subject Dialog */}
      <Dialog open={addSubjectOpen} onOpenChange={setAddSubjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
            <DialogDescription>
              Create a new subject in the curriculum
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject-type">Subject Type</Label>
              <Select
                value={newSubjectForm.subject_type}
                onValueChange={(value: 'SHS' | 'College') => setNewSubjectForm({ ...newSubjectForm, subject_type: value })}
              >
                <SelectTrigger id="subject-type" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHS">SHS</SelectItem>
                  <SelectItem value="College">College</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject-code">Subject Code</Label>
              <Input 
                id="subject-code" 
                placeholder="e.g., CS101" 
                className="mt-2"
                value={newSubjectForm.subject_code}
                onChange={(e) => setNewSubjectForm({ ...newSubjectForm, subject_code: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="subject-name">Subject Name</Label>
              <Input 
                id="subject-name" 
                placeholder="e.g., Introduction to Programming" 
                className="mt-2"
                value={newSubjectForm.subject_name}
                onChange={(e) => setNewSubjectForm({ ...newSubjectForm, subject_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject-units">Units</Label>
                <Input 
                  id="subject-units" 
                  type="number" 
                  placeholder="3" 
                  className="mt-2"
                  value={newSubjectForm.units}
                  onChange={(e) => setNewSubjectForm({ ...newSubjectForm, units: parseInt(e.target.value) || 3 })}
                />
              </div>
              <div>
                <Label htmlFor="subject-course">Course (Optional)</Label>
                <Input 
                  id="subject-course" 
                  placeholder="e.g., BSIT" 
                  className="mt-2"
                  value={newSubjectForm.course}
                  onChange={(e) => setNewSubjectForm({ ...newSubjectForm, course: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject-year">Year Level (Optional)</Label>
                <Input 
                  id="subject-year" 
                  type="number"
                  min="1"
                  max="4"
                  placeholder="1" 
                  className="mt-2"
                  value={newSubjectForm.year_level}
                  onChange={(e) => setNewSubjectForm({ ...newSubjectForm, year_level: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="subject-semester">Semester (Optional)</Label>
                <Select
                  value={newSubjectForm.semester}
                  onValueChange={(value) => setNewSubjectForm({ ...newSubjectForm, semester: value })}
                >
                  <SelectTrigger id="subject-semester" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Semester</SelectItem>
                    <SelectItem value="2nd">2nd Semester</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="subject-description">Description (Optional)</Label>
              <Textarea 
                id="subject-description" 
                placeholder="Subject description" 
                className="mt-2"
                rows={3}
                value={newSubjectForm.description}
                onChange={(e) => setNewSubjectForm({ ...newSubjectForm, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setAddSubjectOpen(false);
                setNewSubjectForm({
                  subject_code: '',
                  subject_name: '',
                  description: '',
                  units: 3,
                  course: '',
                  year_level: 1,
                  semester: '1st',
                  subject_type: selectedStudent?.subject_type || 'College'
                });
              }}>
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={() => handleCreateSubject(newSubjectForm)}
                disabled={loadingSection === 'create-subject'}
              >
                {loadingSection === 'create-subject' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Subject'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Section Dialog */}
      <Dialog open={removeSectionOpen} onOpenChange={setRemoveSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Section</DialogTitle>
            <DialogDescription>
              Select a section to remove
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Section</Label>
              <Select>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose section..." />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name} - {section.course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRemoveSectionOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive">
                Remove Section
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Subject Dialog */}
      <Dialog open={removeSubjectOpen} onOpenChange={setRemoveSubjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Subject</DialogTitle>
            <DialogDescription>
              Select a subject to remove from the curriculum
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Subject</Label>
              <Select>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose subject..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CS101">CS101 - Introduction to Programming</SelectItem>
                  <SelectItem value="MATH201">MATH201 - Calculus I</SelectItem>
                  <SelectItem value="ENG101">ENG101 - Technical Writing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRemoveSubjectOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive">
                Remove Subject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Enter student information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="student-id">Student ID *</Label>
                <Input 
                  id="student-id" 
                  placeholder="e.g., 2024-001" 
                  className="mt-2"
                  value={newStudentForm.student_id}
                  onChange={(e) => setNewStudentForm({...newStudentForm, student_id: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="student-type">Student Type *</Label>
                <Select 
                  value={newStudentForm.student_type}
                  onValueChange={(value) => setNewStudentForm({...newStudentForm, student_type: value})}
                >
                  <SelectTrigger id="student-type" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Transferee">Transferee</SelectItem>
                    <SelectItem value="Returning">Returning</SelectItem>
                    <SelectItem value="Continuing">Continuing</SelectItem>
                    <SelectItem value="Scholar">Scholar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first-name">First Name *</Label>
                <Input 
                  id="first-name" 
                  placeholder="First name" 
                  className="mt-2"
                  value={newStudentForm.first_name}
                  onChange={(e) => setNewStudentForm({...newStudentForm, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="middle-name">Middle Name</Label>
                <Input 
                  id="middle-name" 
                  placeholder="Middle name" 
                  className="mt-2"
                  value={newStudentForm.middle_name}
                  onChange={(e) => setNewStudentForm({...newStudentForm, middle_name: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="last-name">Last Name *</Label>
                <Input 
                  id="last-name" 
                  placeholder="Last name" 
                  className="mt-2"
                  value={newStudentForm.last_name}
                  onChange={(e) => setNewStudentForm({...newStudentForm, last_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="suffix">Suffix</Label>
                <Input 
                  id="suffix" 
                  placeholder="Jr., Sr., etc." 
                  className="mt-2"
                  value={newStudentForm.suffix}
                  onChange={(e) => setNewStudentForm({...newStudentForm, suffix: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course">Course</Label>
                <Select 
                  value={newStudentForm.course}
                  onValueChange={(value) => setNewStudentForm({...newStudentForm, course: value})}
                >
                  <SelectTrigger id="course" className="mt-2">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BSIT">BSIT</SelectItem>
                    <SelectItem value="BSCS">BSCS</SelectItem>
                    <SelectItem value="BSCpE">BSCpE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="year-level">Year Level</Label>
                <Input 
                  id="year-level" 
                  type="number" 
                  min="1" 
                  max="4"
                  placeholder="1-4" 
                  className="mt-2"
                  value={newStudentForm.year_level}
                  onChange={(e) => setNewStudentForm({...newStudentForm, year_level: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select 
                  value={newStudentForm.gender}
                  onValueChange={(value) => setNewStudentForm({...newStudentForm, gender: value})}
                >
                  <SelectTrigger id="gender" className="mt-2">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="birth-date">Birth Date</Label>
                <Input 
                  id="birth-date" 
                  type="date"
                  className="mt-2"
                  value={newStudentForm.birth_date}
                  onChange={(e) => setNewStudentForm({...newStudentForm, birth_date: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                placeholder="Street address" 
                className="mt-2"
                value={newStudentForm.address}
                onChange={(e) => setNewStudentForm({...newStudentForm, address: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="email@example.com" 
                  className="mt-2"
                  value={newStudentForm.email}
                  onChange={(e) => setNewStudentForm({...newStudentForm, email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="contact">Contact Number</Label>
                <Input 
                  id="contact" 
                  placeholder="09XXXXXXXXX" 
                  className="mt-2"
                  value={newStudentForm.contact_number}
                  onChange={(e) => setNewStudentForm({...newStudentForm, contact_number: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setAddStudentOpen(false)}
                disabled={loadingSection === 'add-student'}
              >
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={handleAddStudent}
                disabled={loadingSection === 'add-student' || !newStudentForm.student_id || !newStudentForm.first_name || !newStudentForm.last_name}
              >
                {loadingSection === 'add-student' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Student'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Student Dialog */}
      <Dialog open={removeStudentOpen} onOpenChange={setRemoveStudentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
            <DialogDescription>
              Select a student to remove (Superadmin only)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Student</Label>
              <Select value={selectedStudentToDelete} onValueChange={setSelectedStudentToDelete}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} - {student.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setRemoveStudentOpen(false);
                  setSelectedStudentToDelete('');
                }}
                disabled={loadingSection === 'delete-student'}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteStudent}
                disabled={loadingSection === 'delete-student' || !selectedStudentToDelete}
              >
                {loadingSection === 'delete-student' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove Student'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Faculty Dialog */}
      <Dialog open={addTeacherOpen} onOpenChange={setAddTeacherOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>{`Add New ${personSingular}`}</DialogTitle>
              <DialogDescription>
                {`Enter ${personSingular.toLowerCase()} information`}
              </DialogDescription>
            </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="teacher-faculty-id">Faculty ID</Label>
              <Input 
                id="teacher-faculty-id" 
                placeholder="F-001" 
                className="mt-2"
                value={newTeacherForm.faculty_id}
                onChange={(e) => setNewTeacherForm({ ...newTeacherForm, faculty_id: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teacher-first-name">First Name</Label>
                <Input 
                  id="teacher-first-name" 
                  placeholder="First name" 
                  className="mt-2"
                  value={newTeacherForm.first_name}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="teacher-last-name">Last Name</Label>
                <Input 
                  id="teacher-last-name" 
                  placeholder="Last name" 
                  className="mt-2"
                  value={newTeacherForm.last_name}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, last_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="teacher-dept">Department</Label>
              <Input 
                id="teacher-dept" 
                placeholder="e.g., Computer Science" 
                className="mt-2"
                value={newTeacherForm.department}
                onChange={(e) => setNewTeacherForm({ ...newTeacherForm, department: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teacher-email">Email</Label>
                <Input 
                  id="teacher-email" 
                  type="email"
                  placeholder="email@example.com" 
                  className="mt-2"
                  value={newTeacherForm.email}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="teacher-contact">Contact Number</Label>
                <Input 
                  id="teacher-contact" 
                  placeholder="+63..." 
                  className="mt-2"
                  value={newTeacherForm.contact_number}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, contact_number: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="teacher-specialization">Specialization</Label>
              <Input 
                id="teacher-specialization" 
                placeholder="e.g., Database Systems" 
                className="mt-2"
                value={newTeacherForm.specialization}
                onChange={(e) => setNewTeacherForm({ ...newTeacherForm, specialization: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddTeacherOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={handleCreateTeacher}
                disabled={loadingSection === 'create-teacher'}
              >
                {loadingSection === 'create-teacher' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  `Add ${personSingular}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Faculty Dialog */}
      <Dialog open={editTeacherOpen} onOpenChange={setEditTeacherOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{`Edit ${personSingular}`}</DialogTitle>
              <DialogDescription>
                {`Update ${personSingular.toLowerCase()} information`}
              </DialogDescription>
            </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Faculty ID</Label>
                <Input 
                  value={editTeacherForm.faculty_id}
                  onChange={(e) => setEditTeacherForm({ ...editTeacherForm, faculty_id: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Department</Label>
                <Input 
                  value={editTeacherForm.department}
                  onChange={(e) => setEditTeacherForm({ ...editTeacherForm, department: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input 
                  value={editTeacherForm.first_name}
                  onChange={(e) => setEditTeacherForm({ ...editTeacherForm, first_name: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input 
                  value={editTeacherForm.last_name}
                  onChange={(e) => setEditTeacherForm({ ...editTeacherForm, last_name: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={editTeacherForm.email}
                  onChange={(e) => setEditTeacherForm({ ...editTeacherForm, email: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input 
                  value={editTeacherForm.contact_number}
                  onChange={(e) => setEditTeacherForm({ ...editTeacherForm, contact_number: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={editTeacherForm.status}
                onValueChange={(value) => setEditTeacherForm({ ...editTeacherForm, status: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditTeacherOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={handleUpdateTeacher}
                disabled={loadingSection === 'update-teacher'}
              >
                {loadingSection === 'update-teacher' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Update ${personSingular}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Teacher Dialog */}
      <AlertDialog open={removeTeacherOpen} onOpenChange={setRemoveTeacherOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                {`This will permanently delete ${personSingular.toLowerCase()} ${selectedStudent?.first_name} ${selectedStudent?.last_name}. This action cannot be undone.`}
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTeacher}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Enrollment Request Dialog */}
      <Dialog open={editEnrollmentOpen} onOpenChange={setEditEnrollmentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Enrollment Request</DialogTitle>
            <DialogDescription>
              Update enrollment information for {editingItem?.student}
            </DialogDescription>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-student-name">Student Name</Label>
                  <Input 
                    id="edit-student-name" 
                    defaultValue={editingItem.student}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-student-id">Student ID</Label>
                  <Input 
                    id="edit-student-id" 
                    defaultValue={editingItem.id}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-course">Course</Label>
                  <Select defaultValue={editingItem.course}>
                    <SelectTrigger id="edit-course" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BSIT">BSIT</SelectItem>
                      <SelectItem value="BSCS">BSCS</SelectItem>
                      <SelectItem value="BSCpE">BSCpE</SelectItem>
                      <SelectItem value="STEM">STEM</SelectItem>
                      <SelectItem value="ABM">ABM</SelectItem>
                      <SelectItem value="HUMSS">HUMSS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-type">Student Type</Label>
                  <Select defaultValue={editingItem.type}>
                    <SelectTrigger id="edit-type" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New Student">New Student</SelectItem>
                      <SelectItem value="Transferee">Transferee</SelectItem>
                      <SelectItem value="Returning">Returning</SelectItem>
                      <SelectItem value="Continuing">Continuing</SelectItem>
                      <SelectItem value="Scholar">Scholar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-date">Submission Date</Label>
                  <Input 
                    id="edit-date" 
                    type="date"
                    defaultValue={editingItem.date === 'Today' || editingItem.date === 'Yesterday' ? new Date().toISOString().split('T')[0] : editingItem.date}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-enrollment-status">Status</Label>
                  <Select 
                    value={editingItem.status || 'Pending'}
                    onValueChange={(value) => setEditingItem({...editingItem, status: value})}
                  >
                    <SelectTrigger id="edit-enrollment-status" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                      <SelectItem value="Assessed">Assessed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="edit-documents" 
                  defaultChecked={editingItem.hasDocuments}
                />
                <Label htmlFor="edit-documents" className="cursor-pointer">
                  All documents uploaded
                </Label>
              </div>

              <div className="flex gap-2 justify-end border-t pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditEnrollmentOpen(false);
                    setEditingItem(null);
                  }}
                  disabled={loadingSection === 'edit-enrollment'}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  onClick={handleSaveEnrollmentEdit}
                  disabled={loadingSection === 'edit-enrollment'}
                >
                  {loadingSection === 'edit-enrollment' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={editTransactionOpen} onOpenChange={setEditTransactionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update transaction information for {editingItem?.student}
            </DialogDescription>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-txn-id">Transaction ID</Label>
                  <Input 
                    id="edit-txn-id" 
                    defaultValue={editingItem.id}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-txn-student">Student Name</Label>
                  <Input 
                    id="edit-txn-student" 
                    defaultValue={editingItem.student}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-txn-type">Transaction Type</Label>
                  <Select defaultValue={editingItem.type}>
                    <SelectTrigger id="edit-txn-type" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tuition Fee">Tuition Fee</SelectItem>
                      <SelectItem value="Enrollment Fee">Enrollment Fee</SelectItem>
                      <SelectItem value="Lab Fee">Lab Fee</SelectItem>
                      <SelectItem value="Miscellaneous Fee">Miscellaneous Fee</SelectItem>
                      <SelectItem value="Library Fee">Library Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-txn-amount">Amount</Label>
                  <Input 
                    id="edit-txn-amount" 
                    defaultValue={editingItem.amount}
                    placeholder="₱0.00"
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-txn-date">Transaction Date</Label>
                  <Input 
                    id="edit-txn-date" 
                    type="date"
                    defaultValue={editingItem.date ? new Date().toISOString().split('T')[0] : ''}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-txn-status">Status</Label>
                  <Select 
                    value={editingItem.status}
                    onValueChange={(value) => setEditingItem({...editingItem, status: value})}
                  >
                    <SelectTrigger id="edit-txn-status" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Denied">Denied</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="edit-txn-receipt" 
                  defaultChecked={editingItem.hasReceipt}
                />
                <Label htmlFor="edit-txn-receipt" className="cursor-pointer">
                  Receipt uploaded
                </Label>
              </div>

              <div className="flex gap-2 justify-end border-t pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditTransactionOpen(false);
                    setEditingItem(null);
                  }}
                  disabled={loadingSection === 'edit-transaction'}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-gradient-to-r from-green-600 to-green-700"
                  onClick={handleSaveTransactionEdit}
                  disabled={loadingSection === 'edit-transaction'}
                >
                  {loadingSection === 'edit-transaction' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={editSectionOpen} onOpenChange={setEditSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
            <DialogDescription>
              Update section information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-section-code">Section Code</Label>
                <Input 
                  id="edit-section-code" 
                  className="mt-2"
                  value={editSectionForm.section_code}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, section_code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-section-name">Section Name</Label>
                <Input 
                  id="edit-section-name" 
                  className="mt-2"
                  value={editSectionForm.section_name}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, section_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-section-course">Course/Program</Label>
                <Input 
                  id="edit-section-course" 
                  className="mt-2"
                  value={editSectionForm.course}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, course: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-section-year">Year Level</Label>
                <Input 
                  id="edit-section-year" 
                  type="number"
                  min="1"
                  max="4"
                  className="mt-2"
                  value={editSectionForm.year_level}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, year_level: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-section-school-year">School Year</Label>
                <Input 
                  id="edit-section-school-year" 
                  className="mt-2"
                  value={editSectionForm.school_year}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, school_year: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-section-semester">Semester</Label>
                <Select
                  value={editSectionForm.semester}
                  onValueChange={(value) => setEditSectionForm({ ...editSectionForm, semester: value })}
                >
                  <SelectTrigger id="edit-section-semester" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Semester</SelectItem>
                    <SelectItem value="2nd">2nd Semester</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-section-capacity">Capacity</Label>
              <Input 
                id="edit-section-capacity" 
                type="number"
                className="mt-2"
                value={editSectionForm.capacity}
                onChange={(e) => setEditSectionForm({ ...editSectionForm, capacity: parseInt(e.target.value) || 50 })}
              />
            </div>
            <div>
              <Label htmlFor="edit-section-adviser">Adviser (Optional)</Label>
              <Select
                value={editSectionForm.adviser_id.toString()}
                onValueChange={(value) => setEditSectionForm({ ...editSectionForm, adviser_id: parseInt(value) || 0 })}
              >
                <SelectTrigger id="edit-section-adviser" className="mt-2">
                  <SelectValue placeholder="Select adviser (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.first_name} {teacher.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setEditSectionOpen(false);
                setEditingSection(null);
              }}>
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={handleUpdateSection}
                disabled={loadingSection === 'update-section'}
              >
                {loadingSection === 'update-section' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Section'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog open={editSubjectOpen} onOpenChange={setEditSubjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              Update subject information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-subject-type">Subject Type</Label>
              <Select
                value={editSubjectForm.subject_type}
                onValueChange={(value: 'SHS' | 'College') => setEditSubjectForm({ ...editSubjectForm, subject_type: value })}
              >
                <SelectTrigger id="edit-subject-type" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHS">SHS</SelectItem>
                  <SelectItem value="College">College</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-subject-code">Subject Code</Label>
              <Input 
                id="edit-subject-code" 
                className="mt-2"
                value={editSubjectForm.subject_code}
                onChange={(e) => setEditSubjectForm({ ...editSubjectForm, subject_code: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-subject-name">Subject Name</Label>
              <Input 
                id="edit-subject-name" 
                className="mt-2"
                value={editSubjectForm.subject_name}
                onChange={(e) => setEditSubjectForm({ ...editSubjectForm, subject_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-subject-units">Units</Label>
                <Input 
                  id="edit-subject-units" 
                  type="number" 
                  className="mt-2"
                  value={editSubjectForm.units}
                  onChange={(e) => setEditSubjectForm({ ...editSubjectForm, units: parseInt(e.target.value) || 3 })}
                />
              </div>
              <div>
                <Label htmlFor="edit-subject-course">Course (Optional)</Label>
                <Input 
                  id="edit-subject-course" 
                  className="mt-2"
                  value={editSubjectForm.course}
                  onChange={(e) => setEditSubjectForm({ ...editSubjectForm, course: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-subject-year">Year Level (Optional)</Label>
                <Input 
                  id="edit-subject-year" 
                  type="number"
                  min="1"
                  max="4"
                  className="mt-2"
                  value={editSubjectForm.year_level}
                  onChange={(e) => setEditSubjectForm({ ...editSubjectForm, year_level: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="edit-subject-semester">Semester (Optional)</Label>
                <Select
                  value={editSubjectForm.semester}
                  onValueChange={(value) => setEditSubjectForm({ ...editSubjectForm, semester: value })}
                >
                  <SelectTrigger id="edit-subject-semester" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Semester</SelectItem>
                    <SelectItem value="2nd">2nd Semester</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-subject-description">Description (Optional)</Label>
              <Textarea 
                id="edit-subject-description" 
                className="mt-2"
                rows={3}
                value={editSubjectForm.description}
                onChange={(e) => setEditSubjectForm({ ...editSubjectForm, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setEditSubjectOpen(false);
                setEditingSubject(null);
              }}>
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={handleUpdateSubject}
                disabled={loadingSection === 'update-subject'}
              >
                {loadingSection === 'update-subject' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Subject'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit School Year Dialog */}
      <Dialog open={editSchoolYearOpen} onOpenChange={setEditSchoolYearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit School Year</DialogTitle>
            <DialogDescription>
              Update school year information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-sy-year">School Year</Label>
              <Input 
                id="edit-sy-year" 
                placeholder="2024-2025" 
                className="mt-2"
                value={editSchoolYearForm.school_year}
                onChange={(e) => setEditSchoolYearForm({ ...editSchoolYearForm, school_year: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-sy-start">Start Date</Label>
                <Input 
                  id="edit-sy-start" 
                  type="date"
                  className="mt-2"
                  value={editSchoolYearForm.start_date}
                  onChange={(e) => setEditSchoolYearForm({ ...editSchoolYearForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-sy-end">End Date</Label>
                <Input 
                  id="edit-sy-end" 
                  type="date"
                  className="mt-2"
                  value={editSchoolYearForm.end_date}
                  onChange={(e) => setEditSchoolYearForm({ ...editSchoolYearForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-sy-enroll-start">Enrollment Start</Label>
                <Input 
                  id="edit-sy-enroll-start" 
                  type="date"
                  className="mt-2"
                  value={editSchoolYearForm.enrollment_start}
                  onChange={(e) => setEditSchoolYearForm({ ...editSchoolYearForm, enrollment_start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-sy-enroll-end">Enrollment End</Label>
                <Input 
                  id="edit-sy-enroll-end" 
                  type="date"
                  className="mt-2"
                  value={editSchoolYearForm.enrollment_end}
                  onChange={(e) => setEditSchoolYearForm({ ...editSchoolYearForm, enrollment_end: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="edit-sy-active" 
                checked={editSchoolYearForm.is_active}
                onCheckedChange={(checked) => setEditSchoolYearForm({ ...editSchoolYearForm, is_active: checked === true })}
              />
              <Label htmlFor="edit-sy-active" className="cursor-pointer">
                Set as active school year
              </Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setEditSchoolYearOpen(false);
                setEditingSchoolYear(null);
              }}>
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={handleUpdateSchoolYear}
                disabled={loadingSection === 'update-school-year'}
              >
                {loadingSection === 'update-school-year' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update School Year'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={confirmAction.open} onOpenChange={(open) => !open && setConfirmAction({ open: false, type: null, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction.type === 'approve-transaction' && 'Approve Transaction'}
              {confirmAction.type === 'deny-transaction' && 'Deny Transaction'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction.type === 'approve-transaction' && (
                <>Are you sure you want to approve transaction <strong>{confirmAction.item?.id}</strong> for <strong>{confirmAction.item?.student}</strong>?</>
              )}
              {confirmAction.type === 'deny-transaction' && (
                <>Are you sure you want to deny transaction <strong>{confirmAction.item?.id}</strong> for <strong>{confirmAction.item?.student}</strong>? You can change this later using the Edit button.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmActionHandler}
              className={
                confirmAction.type === 'approve-transaction'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {confirmAction.type === 'approve-transaction' && 'Approve'}
              {confirmAction.type === 'deny-transaction' && 'Deny'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
