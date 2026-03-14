import React, { useState, useEffect } from 'react';
import { API_SERVER_URL } from '../utils/api';
import { Button } from './ui/button';
import { 
  User, 
  LogOut, 
  LayoutDashboard, 
  ClipboardCheck, 
  BookOpen,
  Calendar as CalendarIcon,
  UserCircle,
  GraduationCap,
  Clock,
  CheckCircle2,
  Upload,
  Download,
  Check,
  AlertCircle,
  Bell,
  Loader2,
  QrCode
} from 'lucide-react';
import { enrollmentService } from '../services/enrollment.service';
import { studentService } from '../services/student.service';
import { subjectService } from '../services/subject.service';
import paymentsService from '../services/payments.service';
import { gradesService } from '../services/grades.service';
import { cashierService } from '../services/cashier.service';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { DocumentUpload } from './ui/document-upload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface StudentDashboardProps {
  onLogout: () => void;
}
export default function StudentDashboard({ onLogout }: StudentDashboardProps) {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [studentType, setStudentType] = useState<string>('');
  const [enrollmentStep, setEnrollmentStep] = useState(1);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('basic-info');
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>('none');
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentEnrollment, setCurrentEnrollment] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [currentCourses, setCurrentCourses] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleOptions, setScheduleOptions] = useState<any[]>([]);
  const [selectedScheduleForAdd, setSelectedScheduleForAdd] = useState<number | null>(null);
  const [schedulingSubject, setSchedulingSubject] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [enrollmentDetails, setEnrollmentDetails] = useState<any>(null);
  const [feePerUnit, setFeePerUnit] = useState(700);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, File>>({});
  const [scholarshipSupportingDocs, setScholarshipSupportingDocs] = useState<File[]>([]);
  const [schoolYear, setSchoolYear] = useState('2024-2025');
  const [semester, setSemester] = useState('1st Semester');
  const [installmentPaymentOpen, setInstallmentPaymentOpen] = useState(false);
  const [selectedInstallmentPeriod, setSelectedInstallmentPeriod] = useState<string | null>(null);
  const [penaltyPaymentAmount, setPenaltyPaymentAmount] = useState<number | null>(null);
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    email: '',
    contact_number: '',
    address: '',
    birth_date: '',
    gender: '',
    username: '',
    section: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [grades, setGrades] = useState<any[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingCOR, setDownloadingCOR] = useState(false);
  const [downloadingForm, setDownloadingForm] = useState(false);
  const [scholarshipType, setScholarshipType] = useState<string>('None');
  const [scholarshipLetter, setScholarshipLetter] = useState<File | null>(null);
  const [installmentSchedule, setInstallmentSchedule] = useState<any[]>([]);
  const [penaltyFeeConfig, setPenaltyFeeConfig] = useState<number>(0);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [hasDownPayment, setHasDownPayment] = useState<boolean>(false);
  const [enrollSubjectsSelection, setEnrollSubjectsSelection] = useState<number[]>([]);
  const [enrollAvailableSubjects, setEnrollAvailableSubjects] = useState<any[]>([]);
  const [loadingEnrollSubjects, setLoadingEnrollSubjects] = useState(false);

  const SCHOLAR_TYPES = [
    'None',
    'Merit Scholarship',
    'Academic Scholarship',
    'Financial Assistance Scholarship',
    'Working Student Scholarship',
    'Partnership Scholarships',
    'Promotional Scholarship Grants'
  ];

  // Fetch available courses from subjects
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const resp = await subjectService.getAllSubjects();
        const subjects = resp?.data || resp || [];
        const courses = [...new Set(subjects.map((s: any) => s.course).filter(Boolean))] as string[];
        setAvailableCourses(courses.sort());
      } catch (err) {
        console.error('Failed to fetch courses from subjects:', err);
      }
    };
    fetchCourses();
  }, []);

  const normalizeStudentType = (raw?: string) => {
    if (!raw) return '';
    const typeMap: Record<string, string> = {
      New: 'new',
      Transferee: 'transferee',
      Returning: 'returning',
      Continuing: 'continuing',
      Scholar: 'scholar',
      new: 'new',
      transferee: 'transferee',
      returning: 'returning',
      continuing: 'continuing',
      scholar: 'scholar'
    };
    return typeMap[raw] || raw.toLowerCase();
  };

  // Determine if student needs manual subject selection (Transferee or Irregular classification)
  const requiresSubjectSelection = (): boolean => {
    const type = resolvedStudentType || studentType;
    const classification = studentProfile?.student_classification;
    return type === 'transferee' || classification === 'Irregular';
  };

  // Load available subjects for the student's course filtered by year level (for manual selection)
  const loadEnrollmentSubjects = async () => {
    if (!studentProfile?.course) return;
    try {
      setLoadingEnrollSubjects(true);
      // Fetch subjects for the student's course filtered by their year level
      const resp = await subjectService.getSubjectsByCourse(studentProfile.course, studentProfile.year_level);
      const subjects = resp?.data || resp || [];
      setEnrollAvailableSubjects(subjects);
    } catch (err) {
      console.error('Failed to load subjects for selection:', err);
      setEnrollAvailableSubjects([]);
    } finally {
      setLoadingEnrollSubjects(false);
    }
  };

  const toggleEnrollSubject = (subjectId: number) => {
    setEnrollSubjectsSelection((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const getDocDownloadUrl = (docType: string) => `/uploads/documents/${docType}.pdf`;

  const getOrdinalSuffix = (n: number) => {
    if (!n && n !== 0) return '';
    const v = n % 100;
    if (v >= 11 && v <= 13) return 'th';
    switch (n % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  const rebuildNotifications = (status: string, assessment: any, payments: any[], enrollment: any) => {
    const notices: any[] = [];
    if (status && status !== 'none') {
      notices.push({
        title: 'Enrollment Status',
        detail: `Current status: ${status}`,
        action: status.includes('Payment') ? 'View payments' : undefined,
        actionType: 'payments'
      });
    }

    const total = assessment?.total_amount || assessment?.total || enrollment?.total_amount || 0;
    const paid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const balance = Math.max(total - paid, 0);

    if (balance > 0) {
      notices.push({
        title: 'Outstanding Balance',
        detail: `₱${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining.`,
        action: 'Review payments',
        actionType: 'payments'
      });
    }

    if (enrollment?.section) {
      notices.push({
        title: 'Section Placement',
        detail: `You are tagged under ${enrollment.section}.`,
        action: 'View schedule',
        actionType: 'schedule'
      });
    }

    setNotifications(notices);
    setHasNewNotification(notices.length > 0);
  };

  useEffect(() => {
    fetchStudentData();
    // poll for updates every 30s (notifications and enrollment status)
    const poll = setInterval(() => {
      fetchNotifications();
      fetchStudentData();
    }, 30000);
    fetchNotifications();
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadGrades = async () => {
      if (activeSection !== 'Grades') return;
      try {
        setLoadingGrades(true);
        const sid = studentProfile?.student_id;
        if (!sid) return;
        const resp = await gradesService.getStudentGrades(sid.toString());
        if (!mounted) return;
        setGrades(resp?.data || resp || []);
      } catch (err) {
        console.error('Failed to load grades', err);
        setGrades([]);
      } finally {
        if (mounted) setLoadingGrades(false);
      }
    };
    loadGrades();
    return () => { mounted = false; };
  }, [activeSection, studentProfile]);

  const resolvedStudentType = normalizeStudentType(
    studentProfile?.student_type || enrollmentDetails?.student_type || currentEnrollment?.student_type
  );

  useEffect(() => {
    if (!studentType && resolvedStudentType) {
      setStudentType(resolvedStudentType);
      setEnrollmentStep((prev) => (prev < 2 ? 2 : prev));
    }
  }, [resolvedStudentType, studentType]);

  useEffect(() => {
    let mounted = true;
    const calculateRemainingBalance = async () => {
      if (!currentEnrollment?.id) {
        setInstallmentSchedule([]);
        setHasDownPayment(false);
        return;
      }
      try {
        setLoadingSchedule(true);
        // Fetch actual payment records
        const resp = await studentService.getInstallmentSchedule(currentEnrollment.id);
        if (mounted) {
          const payments = resp?.data || [];
          // Get penalty fee config from backend
          const configuredPenaltyFee = resp?.penalty_fee ?? 0;
          setPenaltyFeeConfig(configuredPenaltyFee);
          // Get the down payment
          const downPayment = payments.find((p: any) => p.period === 'Down Payment');
          // Track whether this is a partial/installment payment enrollment
          setHasDownPayment(!!downPayment);
          // Note: hasFullPaymentTransaction is managed separately via enrollment payment history
          
          if (downPayment && currentEnrollment?.total_amount) {
            const totalAmount = currentEnrollment.total_amount;
            const monthlyAmount = totalAmount / 4;
            
            // Define remaining period names
            const remainingPeriodNames = ['Prelim Period', 'Midterm Period', 'Finals Period'];
            
            // Build remaining periods, checking if they exist in database
            const remainingPeriods = remainingPeriodNames.map(periodName => {
              const existingPayment = payments.find((p: any) => p.period === periodName);
              
              if (existingPayment) {
                // Payment already submitted, show actual status
                return {
                  period: periodName,
                  amount: existingPayment.amount,
                  penalty_amount: existingPayment.penalty_amount || 0,
                  status: existingPayment.status,
                  id: existingPayment.id
                };
              } else {
                // Payment not yet submitted, show as not started
                return {
                  period: periodName,
                  amount: monthlyAmount,
                  penalty_amount: 0,
                  status: 'Not Started',
                  id: null
                };
              }
            });
            
            // Filter to only include periods that still need payment (exclude Approved)
            const unpaidPeriods = remainingPeriods.filter((p: any) => p.status !== 'Approved');
            setInstallmentSchedule(unpaidPeriods);
          } else {
            setInstallmentSchedule([]);
            setHasDownPayment(false);
          }
        }
      } catch (err) {
        console.error('Failed to load installment schedule', err);
        setInstallmentSchedule([]);
        setHasDownPayment(false);
      } finally {
        if (mounted) setLoadingSchedule(false);
      }
    };
    calculateRemainingBalance();
    return () => { mounted = false; };
  }, [currentEnrollment?.id, currentEnrollment?.total_amount]);

  const fetchStudentData = async () => {
    let student: any = null;
    let current: any = null;
    let paymentsList: any[] = [];
    let assessmentPayload: any = null;
    try {
      setLoading(true);
      const profile = await studentService.getProfile();
      student = profile.student || profile.data?.student || profile;
      setStudentProfile(student);

      if (student) {
        setProfileForm({
          first_name: student.first_name || '',
          middle_name: student.middle_name || '',
          last_name: student.last_name || '',
          suffix: student.suffix || '',
          email: student.email || '',
          contact_number: student.contact_number || '',
          address: student.address || '',
          birth_date: student.birth_date || '',
          gender: student.gender || '',
          username: student.username || '',
          course: student.course || '',
          year_level: student.year_level || undefined,
          section: student.section || ''
        });

        if (student.student_type) {
          const mappedType = normalizeStudentType(student.student_type);
          setStudentType(mappedType);
          setEnrollmentStep(2);
        }
      }

      const enrollmentsData = await enrollmentService.getMyEnrollments();
      const enrollmentsList = enrollmentsData?.data || [];
      setEnrollments(enrollmentsList);

      current =
        enrollmentsList.find((e: any) => e.status !== 'Rejected' && e.status !== 'Enrolled') ||
        enrollmentsList.find((e: any) => e.status === 'Enrolled');
      setCurrentEnrollment(current);

      // Load available subjects only for the student's course
      try {
        if (student && student.course) {
          const subjectsResp = await subjectService.getSubjectsByCourse(student.course);
          const subjectsList = subjectsResp?.data || [];
          setAvailableSubjects(
            subjectsList.map((s: any) => ({
              code: s.subject_code,
              name: s.subject_name,
              instructor: 'TBA',
              units: s.units || 0,
              schedule: 'TBA',
              subjectId: s.id
            }))
          );
        } else {
          // No course assigned — intentionally load no subjects for students without course
          console.warn('Student has no course; not loading subjects for student');
          setAvailableSubjects([]);
        }
      } catch (subErr) {
        console.error('Failed to load available subjects:', subErr);
        setAvailableSubjects([]);
      }

      if (current) {
        setEnrollmentStatus(current.status || 'none');
        const detailsResp = await enrollmentService.getEnrollmentDetails(current.id);
        const details = detailsResp?.data?.enrollment || detailsResp?.data || {};
        setEnrollmentDetails(details);
        // Load dynamic fee-per-unit rate for this student's course
        try {
          const course = studentProfile?.course || '';
          if (course) {
            const feeData = await cashierService.getFees(course);
            const rates = Array.isArray(feeData) ? feeData.find((f: any) => f.course === course) : feeData;
            if (rates?.tuition_per_unit) setFeePerUnit(rates.tuition_per_unit);
          }
        } catch { /* use default */ }
        const subjects = detailsResp?.data?.subjects || details.enrollment_subjects || [];
        setCurrentCourses(
          subjects.map((es: any) => {
            const firstOption = (es.schedule_options && es.schedule_options.length > 0) ? es.schedule_options[0] : null;
            return {
              code: es.subject_code || es.subject?.subject_code || '',
              name: es.subject_name || es.subject?.subject_name || '',
              instructor: es.instructor || es.schedule_instructor || es.subject?.instructor || (firstOption?.instructor) || 'TBA',
              units: es.units || es.subject?.units || 0,
              // prefer enrollment_subjects.schedule, then joined schedule_day_time, then first available schedule option
              schedule: es.schedule || es.schedule_day_time || (firstOption?.day_time) || '',
              room: es.room || es.schedule_room || (firstOption?.room) || '',
              subject_id: es.subject_id || es.subject?.id,
              schedule_id: es.schedule_id || null,
              scheduleOptions: es.schedule_options || []
            };
          })
        );

        const scheduleList = subjects.map((es: any) => ({
          day: es.schedule?.split(' ')[0] || 'TBA',
          time: es.schedule?.split(' ').slice(1).join(' ') || 'TBA',
          subject: es.subject_code || es.subject?.subject_code || '',
          room: es.room || 'TBA'
        }));
        setSchedule(scheduleList);
      }

      // Preload assessment and payments using student_id when available
      // Each call is independent so one failure doesn't break the others
      if (student?.student_id) {
        const studentIdStr = student.student_id.toString();

        // Fetch assessment independently
        try {
          const assessmentResp = await paymentsService.getAssessment(studentIdStr);
          assessmentPayload = assessmentResp?.data || assessmentResp;
          setAssessmentData(assessmentPayload);
        } catch (assessErr) {
          console.error('Assessment fetch failed:', assessErr);
        }

        // Fetch regular payments (from transactions table)
        let regularPayments: any[] = [];
        try {
          const regularResp = await paymentsService.listPayments(studentIdStr);
          regularPayments = (regularResp?.data || regularResp || []).filter((p: any) => 
            !p.student_id || p.student_id === student.student_id || p.student_id.toString() === studentIdStr || p.studentId === studentIdStr
          );
        } catch (payErr) {
          console.error('Payment history fetch failed:', payErr);
        }

        // Fetch approved installment payments independently
        let approvedPayments: any[] = [];
        try {
          const approvedResp = await paymentsService.getApprovedPayments(studentIdStr);
          approvedPayments = (approvedResp?.data || approvedResp || []).filter((p: any) => 
            !p.student_id || p.student_id === student.student_id || p.student_id.toString() === studentIdStr
          );
        } catch (approvedErr) {
          console.error('Approved payments fetch failed:', approvedErr);
        }
          
        // Merge payments: combine regular and approved, deduplicating by ID
        const paymentMap = new Map();
          
        regularPayments.forEach((p: any) => {
          paymentMap.set(p.id, p);
        });
          
        approvedPayments.forEach((p: any) => {
          if (paymentMap.has(p.id)) {
            paymentMap.set(p.id, { ...paymentMap.get(p.id), ...p, status: 'Approved' });
          } else {
            paymentMap.set(p.id, { ...p, status: 'Approved' });
          }
        });
          
        paymentsList = Array.from(paymentMap.values());
        setPaymentHistory(paymentsList);
      }


    } catch (err) {
      console.error('Failed loading student data', err);
      let subjectsResp;
      if (student && student.course) {
        subjectsResp = await subjectService.getSubjectsByCourse(student.course);
      } else {

  
        subjectsResp = await subjectService.getAllSubjects();
      }

      const subjectsList = subjectsResp?.data || [];
      setAvailableSubjects(
        subjectsList.map((s: any) => ({
          code: s.subject_code,
          name: s.subject_name,
          instructor: 'TBA',
          units: s.units || 0,
          schedule: 'TBA',
          subjectId: s.id
        }))
      );

      // Fetch actual notifications from database for all status changes
      try {
        await fetchNotifications();
      } catch (notifErr) {
        console.error('Failed to fetch notifications:', notifErr);
      }
    } finally {
      setLoading(false);
    }
  };

    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true);
        const resp = await studentService.listNotifications();
        const items = resp?.data || resp || [];

        // Map notification data correctly from the notifications table
        const notices = items.map((notif: any) => ({
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          created_at: notif.created_at,
          is_read: notif.is_read
        }));

        setNotifications(notices);
        setHasNewNotification(notices.some((n: any) => !n.is_read));
      } catch (err) {
        console.error('Failed fetching notifications', err);
      } finally {
        setNotificationsLoading(false);
      }
    };

    const markNotificationRead = async (id: number | string) => {
      try {
        await studentService.markNotificationRead(id as any);
        setNotifications(prev => prev.map((n: any) => n.id === Number(id) ? { ...n, is_read: true } : n));
        setHasNewNotification(notifications.some((n: any) => !n.is_read));
      } catch (err) {
        console.error('Failed marking notification read', err);
      }
    };

  const stats = [
    { 
      label: 'Total Enrollments', 
      value: enrollments.length.toString(), 
      icon: ClipboardCheck, 
      color: 'from-blue-500 to-blue-600' 
    },
    { 
      label: 'Approved', 
      value: enrollments.filter((e: any) => e.status === 'Approved').length.toString(), 
      icon: CheckCircle2, 
      color: 'from-green-500 to-green-600' 
    },
    { 
      label: 'Pending', 
      value: enrollments.filter((e: any) => e.status === 'Pending').length.toString(), 
      icon: Clock, 
      color: 'from-orange-500 to-orange-600' 
    },
  ];

  const toggleSubject = (code: string) => {
    // Allow subject selection when status is "For Subject Selection"
    if (enrollmentStatus !== 'For Subject Selection') return;
    
    setSelectedSubjects(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handleSubmitSubjects = async () => {
    if (!currentEnrollment) return;
    if (!window.confirm('Are you sure you want to submit your subjects for assessment?')) return;
    
    try {
      setLoading(true);
      await enrollmentService.submitSubjects(currentEnrollment.id);
      await fetchStudentData();
      alert('Subjects submitted for Registrar assessment');
    } catch (error: any) {
      alert(error.message || 'Failed to submit subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async (paymentData: {
    payment_method: string;
    reference_number: string;
    receipt_path?: string;
    amount?: number;
  }) => {
    if (!currentEnrollment) return;
    if (!window.confirm('Are you sure you want to submit this payment?')) return;
    
    try {
      setLoading(true);
      await enrollmentService.submitPayment(currentEnrollment.id, paymentData);
      await fetchStudentData();
      alert('Payment submitted for verification');
    } catch (error: any) {
      alert(error.message || 'Failed to submit payment');
    } finally {
      setLoading(false);
    }
  };

  const getRequiredDocuments = (studentType: string): string[] => {
    const requiredDocs: Record<string, string[]> = {
      'New': ['diploma', 'picture_2x2', 'clearance_form'],
      'Transferee': ['tor', 'certificate_transfer', 'clearance_form'],
      'Returning': ['form137', 'clearance_form'],
      'Continuing': ['clearance_form'],
      'Scholar': scholarshipType !== 'None' 
        ? ['scholarship_application', 'scholarship_supporting', 'clearance_form', 'dtr_form'] 
        : ['form137', 'form138', 'clearance_form']
    };
    return requiredDocs[studentType] || [];
  };

  const getOptionalDocuments = (studentType: string): string[] => {
    // Birth certificate and good moral are optional for all student types
    return ['birth_certificate', 'moral_certificate'];
  };

  const areDocumentsComplete = (studentType: string): boolean => {
    const requiredDocs = getRequiredDocuments(studentType);
    return requiredDocs.length > 0 && requiredDocs.every(doc => {
      if (doc === 'scholarship_supporting') {
        return scholarshipSupportingDocs.length > 0;
      }
      return uploadedDocuments[doc];
    });
  };

  const handleSubmitForAssessment = async () => {
    if (!window.confirm('Are you sure you want to submit your enrollment for assessment?')) return;
    try {
      if (scholarshipType !== 'None' && !scholarshipLetter) {
        alert('Please upload your scholarship letter before proceeding.');
        return;
      }

      setSubmitting(true);
      
      // Normalize semester to match backend CHECK constraint ('1st', '2nd', 'Summer')
      const normalizedSemester = semester?.toString().includes('1st')
        ? '1st'
        : semester?.toString().includes('2nd')
        ? '2nd'
        : semester?.toString().toLowerCase().includes('summer')
        ? 'Summer'
        : semester;

      // Create enrollment
      const enrollment = await enrollmentService.createEnrollment(schoolYear, normalizedSemester, scholarshipType);
      const enrollmentId = enrollment?.data?.id || enrollment?.enrollment?.id || enrollment?.id;

      if (!enrollmentId) {
        throw new Error('Failed to retrieve created enrollment id');
      }

      // Upload scholarship letter if provided
      if (scholarshipLetter) {
        await studentService.uploadDocument(scholarshipLetter, 'scholarship_letter', enrollmentId);
      }

      // Upload documents if any
      for (const [docType, file] of Object.entries(uploadedDocuments)) {
        if (file instanceof File) {
          await studentService.uploadDocument(file, docType, enrollmentId);
        }
      }

      // Upload multiple scholarship supporting documents if any
      if (scholarshipSupportingDocs.length > 0) {
        for (const file of scholarshipSupportingDocs) {
          if (file instanceof File) {
            await studentService.uploadDocument(file, 'scholarship_supporting', enrollmentId);
          }
        }
      }

      // For Transferee/Irregular students: add their manually selected subjects
      if (requiresSubjectSelection() && enrollSubjectsSelection.length > 0) {
        for (const subjectId of enrollSubjectsSelection) {
          try {
            await enrollmentService.addSubject(enrollmentId, subjectId);
          } catch (err) {
            console.warn(`Failed to add subject ${subjectId}:`, err);
          }
        }
      }

      // Submit for assessment
      await enrollmentService.submitForAssessment(enrollmentId);
      
      setEnrollmentStatus('Pending Assessment');
      setEnrollmentStep(1);
      setStudentType('');
      setUploadedDocuments({});
      setScholarshipType('None');
      setScholarshipLetter(null);
      setScholarshipSupportingDocs([]);
      setEnrollSubjectsSelection([]);
      setEnrollAvailableSubjects([]);
      setActiveSection('Dashboard');
      await fetchStudentData();
    } catch (error: any) {
      alert(error.message || 'Failed to submit enrollment');
    } finally {
      setSubmitting(false);
    }
  };

  const openAssessmentModal = async (enrollmentId?: number) => {
    try {
      setLoadingAssessment(true);
      const id = enrollmentId || currentEnrollment?.id;
      if (!id) return;
      const detailsResp = await enrollmentService.getEnrollmentDetails(id);
      const details = detailsResp?.data?.enrollment || detailsResp?.data || {};
      setEnrollmentDetails(details);
      const subjects = detailsResp?.data?.subjects || details.enrollment_subjects || [];
      setCurrentCourses(subjects.map((es: any) => {
        const firstOption = (es.schedule_options && es.schedule_options.length > 0) ? es.schedule_options[0] : null;
        return {
          code: es.subject_code || es.subject?.subject_code || '',
          name: es.subject_name || es.subject?.subject_name || '',
          units: es.units || es.subject?.units || 0,
          instructor: es.instructor || es.schedule_instructor || es.subject?.instructor || (firstOption?.instructor) || 'TBA',
          schedule: es.schedule || es.schedule_day_time || (firstOption?.day_time) || '',
          room: es.room || es.schedule_room || (firstOption?.room) || ''
        };
      }));
      setAssessmentOpen(true);
    } catch (err: any) {
      console.error('Failed to load assessment details:', err);
      alert(err.message || 'Failed to load assessment details');
    } finally {
      setLoadingAssessment(false);
    }
  };

  const handleDocumentUpload = (docType: string, file: File | null) => {
    if (file === null) {
      const updated = { ...uploadedDocuments };
      delete updated[docType];
      setUploadedDocuments(updated);
    } else {
      setUploadedDocuments({...uploadedDocuments, [docType]: file});
    }
  };

  const handleAddSubject = async (subjectId: number) => {
    if (!currentEnrollment) return;
    
    try {
      await enrollmentService.addSubject(currentEnrollment.id, subjectId);
      await fetchStudentData();
    } catch (error: any) {
      alert(error.message || 'Failed to add subject');
    }
  };

  const openScheduleSelector = async (subject: any) => {
    if (!currentEnrollment) return;
    try {
      const resp = await subjectService.getSchedules(subject.subjectId);
      const list = resp?.data || [];
      if (list.length === 0) {
        // no schedules, add directly
        await enrollmentService.addSubject(currentEnrollment.id, subject.subjectId);
        await fetchStudentData();
        return;
      }
      setScheduleOptions(list);
      setSchedulingSubject(subject);
      setSelectedScheduleForAdd(list[0]?.id || null);
      setScheduleModalOpen(true);
    } catch (err: any) {
      console.error('Failed to fetch schedules', err);
      // fallback: add without schedule
      await enrollmentService.addSubject(currentEnrollment.id, subject.subjectId);
      await fetchStudentData();
    }
  };

  const confirmAddWithSchedule = async () => {
    if (!schedulingSubject || !currentEnrollment) return;
    try {
      setLoading(true);
      await enrollmentService.addSubject(currentEnrollment.id, schedulingSubject.subjectId, undefined, undefined, undefined, selectedScheduleForAdd || undefined);
      setScheduleModalOpen(false);
      setSchedulingSubject(null);
      await fetchStudentData();
    } catch (err: any) {
      alert(err.message || 'Failed to add subject with schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSubject = async (subjectId: number) => {
    if (!currentEnrollment) return;
    
    try {
      await enrollmentService.removeSubject(currentEnrollment.id, subjectId);
      await fetchStudentData();
    } catch (error: any) {
      alert(error.message || 'Failed to remove subject');
    }
  };

  const handleViewNotification = () => {
    setShowNotification(true);
    // mark unread notifications as read when opening
    const unread = notifications.filter((n: any) => !n.is_read).map((n: any) => n.id);
    unread.forEach(id => { markNotificationRead(id); });
    setHasNewNotification(false);
  };

  const openPaymentsModal = async (studentId?: string) => {
    try {
      setLoadingAssessment(true);
      const id = studentId || studentProfile?.student_id;
      if (!id) return;
      
      // Fetch assessment and payments only for the current student
      const assessmentResp = await paymentsService.getAssessment(id.toString());
      const paymentsResp = await paymentsService.listPayments(id.toString());
      const approvedResp = await paymentsService.getApprovedPayments(id.toString());
      
      setAssessmentData(assessmentResp?.data || assessmentResp);
      
      // Merge regular and approved payments, removing duplicates
      // Only include payments for the current student (id)
      const regularPayments = (paymentsResp?.data || paymentsResp || []).filter((p: any) => !p.student_id || p.student_id === id || p.student_id.toString() === id.toString());
      const approvedPayments = (approvedResp?.data || approvedResp || []).filter((p: any) => !p.student_id || p.student_id === id || p.student_id.toString() === id.toString());
      
      // Combine and deduplicate: prefer approved payments if both exist
      const paymentMap = new Map();
      
      // Add regular payments first
      regularPayments.forEach((p: any) => {
        paymentMap.set(p.id, p);
      });
      
      // Add/override with approved payments
      approvedPayments.forEach((p: any) => {
        if (paymentMap.has(p.id)) {
          // Merge approved details into existing payment
          paymentMap.set(p.id, { ...paymentMap.get(p.id), ...p, status: 'Approved' });
        } else {
          paymentMap.set(p.id, { ...p, status: 'Approved' });
        }
      });
      
      const history = Array.from(paymentMap.values());
      setPaymentHistory(history);
      rebuildNotifications(enrollmentStatus, assessmentResp?.data || assessmentResp, history, currentEnrollment);
      setPaymentsOpen(true);
    } catch (err: any) {
      console.error('Failed to load payments:', err);
      alert(err.message || 'Failed to load payments');
    } finally {
      setLoadingAssessment(false);
    }
  };

  const handleDownloadEnrollmentForm = (enrollmentId?: any) => {
    const id = enrollmentId || currentEnrollment?.id;
    if (!id) {
      alert('No enrollment form available');
      return;
    }
    // Attempt to download from uploads folder; fallback to alert
    const url = `/uploads/documents/enrollment-form-${id}.pdf`;
    window.open(url, '_blank');
  };

  const handleDownloadReceipt = (payment: any) => {
    try {
      // If server-generated receipt path is available, download it directly
      if (payment.receipt_path) {
        window.open(`${API_SERVER_URL}${payment.receipt_path}`, '_blank');
        return;
      }
      
      // Fallback: generate receipt client-side
      generateSimpleReceipt(payment);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      // Fallback to client-side generation
      generateSimpleReceipt(payment);
    }
  };

  const generateSimpleReceipt = (payment: any) => {
    const isApproved = payment.status === 'Approved' || payment.status === 'Completed' || payment.approved_at;
    const receiptTitle = isApproved ? 'PAYMENT RECEIPT' : 'PAYMENT CONFIRMATION';
    
    const receiptContent = `
      ${receiptTitle}
      =====================================
      
      Student: ${studentProfile?.first_name || ''} ${studentProfile?.last_name || ''}
      Student ID: ${studentProfile?.student_id || ''}
      
      Date: ${new Date(payment.ts || payment.created_at).toLocaleDateString()}
      Time: ${new Date(payment.ts || payment.created_at).toLocaleTimeString()}
      
      Reference: ${payment.reference || payment.reference_number || payment.id || 'N/A'}
      Method: ${payment.method || payment.payment_method || 'N/A'}
      
      Amount: ₱${(payment.amount || payment.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      
      Status: ${isApproved ? (payment.status === 'Completed' ? 'Verified' : 'Approved') : payment.status || 'Pending'}
      
      ${payment.approved_at ? `Approved Date: ${new Date(payment.approved_at).toLocaleDateString()}` : ''}
      ${payment.remarks ? `Remarks: ${payment.remarks}` : ''}
      
      =====================================
      ${isApproved ? 'Thank you for your payment!' : 'Payment is pending verification.'}
    `;
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(receiptContent));
    element.setAttribute('download', `${isApproved ? 'Receipt' : 'Confirmation'}_${payment.id || 'Payment'}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      await studentService.updateProfile(profileForm);
      alert('Profile updated successfully');
      await fetchStudentData();
    } catch (error: any) {
      alert(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('New password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      await studentService.changePassword(passwordForm.newPassword);
      alert('Password changed successfully');
      setPasswordForm({
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      alert(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Payment Form Component
  const PaymentForm = ({ 
    enrollment, 
    onViewAssessment, 
    loadingAssessment, 
    onSubmit, 
    loading,
    installmentPeriod,
    overrideAmount
  }: { 
    enrollment: any; 
    onViewAssessment: () => void; 
    loadingAssessment: boolean; 
    onSubmit: (data: any) => void;
    loading: boolean;
    installmentPeriod?: string;
    overrideAmount?: number;
  }) => {
    const [paymentType, setPaymentType] = useState('full'); // 'full' or 'partial'
    const [paymentMethod, setPaymentMethod] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [enteredPaymentAmount, setEnteredPaymentAmount] = useState('');
    const [uploading, setUploading] = useState(false);
    const [showBankDetails, setShowBankDetails] = useState(false);

    // Calculate installment amounts
    const totalAmount = enrollment.total_amount || 0;
    const downPaymentAmount = (totalAmount / 4) + (totalAmount * 0.15); // 1/4 + 15% interest
    const monthlyAmount = totalAmount / 4;

    // If this is for a remaining installment period
    const isRemainingInstallment = !!installmentPeriod && installmentPeriod !== 'Down Payment';
    const paymentAmount = overrideAmount || (isRemainingInstallment ? monthlyAmount : downPaymentAmount);
    const paymentPeriod = installmentPeriod || 'Down Payment';
    const isPenaltyPayment = !!overrideAmount;

    const handleSubmit = async () => {
      if (!paymentMethod) {
        alert('Please select a payment method');
        return;
      }
      if (!referenceNumber) {
        alert('Please enter reference number');
        return;
      }
      if (!enteredPaymentAmount) {
        alert('Please enter the amount paid');
        return;
      }
      const amountValue = parseFloat(enteredPaymentAmount);
      if (isNaN(amountValue) || amountValue <= 0) {
        alert('Please enter a valid amount');
        return;
      }
      if (!window.confirm('Are you sure you want to submit this payment?')) return;

      try {
        setUploading(true);
        let receiptPath = '';
        
        // Upload receipt first if provided
        if (receiptFile) {
          const uploadResp = await studentService.uploadDocument(
            receiptFile, 
            'payment_receipt', 
            enrollment.id
          );
          receiptPath = uploadResp?.data?.file_path || '';
        }

        // For any installment period (including remaining periods), submit installment payment
        if (paymentType === 'partial' || isRemainingInstallment) {
          await studentService.submitInstallmentPayment({
            enrollmentId: enrollment.id,
            studentId: enrollment.student_id,
            amount: paymentAmount,
            amountPaid: amountValue,
            period: isPenaltyPayment ? `${paymentPeriod} - Late Penalty Fee` : paymentPeriod,
            paymentMethod,
            referenceNumber,
            receiptPath
          });
          alert(`${isPenaltyPayment ? `${paymentPeriod} late penalty fee` : paymentPeriod} payment submitted for verification`);
          window.location.reload();
        } else {
          // Otherwise, submit regular full payment
          await onSubmit({
            payment_method: paymentMethod,
            reference_number: referenceNumber,
            receipt_path: receiptPath,
            amount: amountValue
          });
        }
      } catch (error: any) {
        alert(error.message || 'Failed to submit payment');
      } finally {
        setUploading(false);
      }
    };

    return (
      <Card className="border-0 shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-purple-600" />
          </div>
          {isRemainingInstallment ? (
            <>
              <h3 className="text-xl font-semibold mb-2">
                {isPenaltyPayment ? `Late Penalty Fee - ${paymentPeriod}` : `${paymentPeriod} Payment`}
              </h3>
              <p className="text-slate-600 mb-4">
                {isPenaltyPayment ? 'Penalty fee' : 'Amount'} due: ₱{paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold mb-2">Proceed to Payment</h3>
              <p className="text-slate-600 mb-4">
                Your subjects have been approved. Total amount: ₱{enrollment.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
            </>
          )}
          
          {/* Assessment Breakdown - Only show for initial payment, not for remaining installments */}
          {!isRemainingInstallment && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
              <h4 className="font-medium mb-2">Assessment Breakdown</h4>
              <div className="text-sm space-y-1">
                {enrollment.tuition > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tuition Fee</span>
                    <span>₱{enrollment.tuition?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {enrollment.registration > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Registration Fee</span>
                    <span>₱{enrollment.registration?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {enrollment.library > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Library Fee</span>
                    <span>₱{enrollment.library?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {enrollment.lab > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Laboratory Fee</span>
                    <span>₱{enrollment.lab?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {enrollment.id_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">ID Fee</span>
                    <span>₱{enrollment.id_fee?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {enrollment.others > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Other Fees</span>
                    <span>₱{enrollment.others?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                  <span>Total</span>
                  <span>₱{enrollment.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <Button variant="outline" onClick={onViewAssessment} disabled={loadingAssessment}>
              {loadingAssessment ? <Loader2 className="h-4 w-4 animate-spin" /> : 'View Full Assessment'}
            </Button>
            <Button 
              variant="outline" 
              className="ml-2"
              onClick={() => setShowBankDetails(true)}
            >
              View QR Code & Bank Details
            </Button>
          </div>
        </div>

        {/* Payment Type Selection - Only show for initial payment */}
        {!isRemainingInstallment && (
          <div className="space-y-4 mb-6">
            <Label className="text-base font-semibold">Select Payment Type</Label>
            <div className="space-y-3">
              <div className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-blue-50" 
                onClick={() => setPaymentType('full')}
              >
                <input 
                  type="radio" 
                  name="paymentType" 
                  value="full"
                  checked={paymentType === 'full'}
                  onChange={() => setPaymentType('full')}
                  className="w-4 h-4"
                />
                <div className="ml-4 flex-1">
                  <p className="font-medium">Full Payment</p>
                  <p className="text-sm text-slate-500">Pay the entire amount now</p>
                  <p className="text-sm font-semibold text-blue-600 mt-1">Total: ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-orange-50" 
                onClick={() => setPaymentType('partial')}
              >
                <input 
                  type="radio" 
                  name="paymentType" 
                  value="partial"
                  checked={paymentType === 'partial'}
                  onChange={() => setPaymentType('partial')}
                  className="w-4 h-4"
                />
                <div className="ml-4 flex-1">
                  <p className="font-medium">Installment Payment (Partial)</p>
                  <p className="text-sm text-slate-500">Pay down payment now, rest in installments</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-orange-600 font-semibold">Down Payment (Due Soon): ₱{downPaymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (includes 15% interest)</p>
                    <p className="text-slate-600">Monthly Installments (3x): ₱{monthlyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} each</p>
                    <p className="text-xs text-slate-500">Periods: Prelim, Midterm, Finals</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Online Payment">Online Payment (GCash, Maya, etc.)</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference Number *</Label>
              <Input 
                placeholder="Enter reference/transaction number" 
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Amount Paid *</Label>
            <Input 
              type="number" 
              placeholder="Enter amount you are paying" 
              value={enteredPaymentAmount}
              onChange={(e) => setEnteredPaymentAmount(e.target.value)}
              step="0.01"
              min="0"
            />
            {enteredPaymentAmount && (
              <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm font-medium text-blue-900">Balance Summary:</p>
                <p className="text-sm text-blue-700 mt-1">
                  {isPenaltyPayment ? 'Penalty Amount' : 'Total Amount'}: ₱{(isPenaltyPayment ? paymentAmount : totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-blue-700">
                  Amount Paying: ₱{parseFloat(enteredPaymentAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm font-semibold text-blue-900 mt-1">
                  Remaining Balance: ₱{Math.max((isPenaltyPayment ? paymentAmount : totalAmount) - parseFloat(enteredPaymentAmount || '0'), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
          <div>
            <Label>Upload Proof of Payment *</Label>
            <Input 
              type="file" 
              accept="image/*,.pdf" 
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-slate-500 mt-1">Upload a screenshot or photo of your payment receipt (JPG, PNG, PDF)</p>
          </div>
          <Button 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
            onClick={handleSubmit}
            disabled={loading || uploading || !paymentMethod || !referenceNumber || !enteredPaymentAmount}
          >
            {(loading || uploading) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Submit Payment for Verification
              </>
            )}
          </Button>
          <p className="text-xs text-slate-500 text-center">
            Your payment will be reviewed by the cashier. You will be notified once verified.
          </p>
        </div>

        {/* Installment Payment Schedule - Show if partial payment was selected */}
        {paymentType === 'partial' && installmentSchedule.length > 0 && (
          <div className="mt-6">
            <Card className="border border-orange-200 bg-orange-50 p-4">
              <h4 className="font-semibold text-orange-900 mb-4">Your Installment Payment Schedule</h4>
              <div className="space-y-3">
                {installmentSchedule.map((payment: any, index: number) => (
                  <React.Fragment key={payment.id || index}>
                    <div className="flex items-center justify-between bg-white p-3 rounded border border-orange-100">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{payment.period}</p>
                        <p className="text-xs text-slate-600">Amount: ₱{(payment.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <Badge className={`
                        ${payment.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                          payment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                          payment.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                          'bg-slate-100 text-slate-800'}
                      `}>
                        {payment.status}
                      </Badge>
                    </div>
                    {(payment.penalty_amount || 0) > 0 && (
                      <div className="flex items-center justify-between bg-red-50 p-3 rounded border border-red-200 ml-4">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-red-800">Late Payment Penalty</p>
                          <p className="text-xs text-red-600">₱{(payment.penalty_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Bank Details & QR Code Modal */}
        <Dialog open={showBankDetails} onOpenChange={setShowBankDetails}>
          <DialogContent className="max-w-md sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Payment Information</DialogTitle>
              <DialogDescription>Bank Account & QR Code for Transfer</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* QR Code Section */}
              <div className="flex flex-col items-center">
                <div className="bg-slate-100 p-4 rounded-lg mb-2">
                  <div className="w-40 h-40 bg-white flex items-center justify-center border-2 border-dashed border-slate-300 rounded">
                    <div className="text-center">
                      <QrCode className="h-16 w-16 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">QR Code</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500">Scan to transfer via GCash/Maya</p>
              </div>

              {/* Bank Account Details */}
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 mb-3">Bank Transfer Details</p>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Bank Name</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-slate-900 font-semibold">Banco ng Pilipinas (BPI)</p>
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            navigator.clipboard.writeText('Banco ng Pilipinas (BPI)');
                            alert('Copied to clipboard');
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-600 font-medium">Account Number</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-slate-900 font-mono font-semibold">1234-5678-9012-3456</p>
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            navigator.clipboard.writeText('1234-5678-9012-3456');
                            alert('Copied to clipboard');
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-600 font-medium">Account Holder</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-slate-900 font-semibold">Infomatics College Northgate</p>
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            navigator.clipboard.writeText('Infomatics College Northgate');
                            alert('Copied to clipboard');
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-600 font-medium">Branch Code</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-slate-900 font-mono font-semibold">010</p>
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            navigator.clipboard.writeText('010');
                            alert('Copied to clipboard');
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-900">
                    <span className="font-semibold">Note:</span> After transferring, upload your receipt/proof of payment below.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBankDetails(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  };

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Status Alert */}
        {enrollmentStatus === 'Enrolled' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">Enrollment Complete!</AlertTitle>
            <AlertDescription className="text-green-700">
              You are now enrolled. You can view your schedule and download your enrollment form.
            </AlertDescription>
          </Alert>
        )}

        {enrollmentStatus === 'Payment Verification' && (
          <Alert className="bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Payment Verification</AlertTitle>
            <AlertDescription className="text-blue-700">
              Your payment is being verified by the cashier. You will be notified once verified.
            </AlertDescription>
          </Alert>
        )}

        {enrollmentStatus === 'For Payment' && (
          <Alert className="bg-red-50 border-red-200">
            <Clock className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-900">Proceed to Payment</AlertTitle>
            <AlertDescription className="text-red-700">
              Your subjects have been approved. Please proceed to payment.
            </AlertDescription>
          </Alert>
        )}

        {enrollmentStatus === 'For Registrar Assessment' && (
          <Alert className="bg-indigo-50 border-indigo-200">
            <Clock className="h-4 w-4 text-indigo-600" />
            <AlertTitle className="text-indigo-900">Awaiting Registrar Assessment</AlertTitle>
            <AlertDescription className="text-indigo-700">
              Your subject selection has been submitted. The Registrar is reviewing your enrollment fees.
            </AlertDescription>
          </Alert>
        )}

        {enrollmentStatus === 'For Dean Approval' && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-900">Awaiting Dean Approval</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Your enrollment fees have been assessed. Awaiting Dean approval.
            </AlertDescription>
          </Alert>
        )}

        {enrollmentStatus === 'For Subject Selection' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">Select Your Subjects</AlertTitle>
            <AlertDescription className="text-green-700">
              Your enrollment has been approved. Please select your subjects.
            </AlertDescription>
          </Alert>
        )}

        {enrollmentStatus === 'For Admin Approval' && (
          <Alert className="bg-orange-50 border-orange-200">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900">Awaiting Admin Approval</AlertTitle>
            <AlertDescription className="text-orange-700">
              Your enrollment has been assessed. Waiting for admin approval.
            </AlertDescription>
          </Alert>
        )}

        {enrollmentStatus === 'Pending Assessment' && (
          <Alert className="bg-orange-50 border-orange-200">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900">Pending Assessment</AlertTitle>
            <AlertDescription className="text-orange-700">
              Your enrollment documents have been submitted and are awaiting registrar assessment.
            </AlertDescription>
          </Alert>
        )}

        {enrollmentStatus === 'Rejected' && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-900">Enrollment Rejected</AlertTitle>
            <AlertDescription className="text-red-700">
              Please contact the admin office for more information.
            </AlertDescription>
          </Alert>
        )}

        {/* Remaining Installments Section - Show only if there are unpaid installment periods */}
        {enrollmentStatus === 'Enrolled' && installmentSchedule.length > 0 && hasDownPayment && (
          <Card className="border border-blue-200 bg-blue-50 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Remaining Installment Payments</h3>
            <p className="text-sm text-slate-600 mb-4">You have paid the down payment. Below is your remaining balance to pay:</p>
            <div className="space-y-4">
              {installmentSchedule.map((payment: any, idx: number) => {
                const periodOffset: Record<string, number> = { 'Prelim Period': 1, 'Midterm Period': 2, 'Finals Period': 3 };
                const enrollDate = new Date(currentEnrollment?.enrollment_date || currentEnrollment?.created_at);
                const dueDate = new Date(enrollDate);
                dueDate.setMonth(dueDate.getMonth() + (periodOffset[payment.period] ?? (idx + 1)));
                const isOverdue = new Date() > dueDate && payment.status !== 'Approved';
                // Check if any previous period has an unpaid penalty (blocks paying next periods)
                const hasUnpaidPriorPenalty = installmentSchedule.slice(0, idx).some((prev: any) => (prev.penalty_amount || 0) > 0);
                const canPayPeriod = !hasUnpaidPriorPenalty && (payment.status === 'Not Started' || payment.status === 'Rejected');
                // Auto-calculated penalty for overdue periods not yet submitted
                const autoCalculatedPenalty = (isOverdue && payment.status === 'Not Started' && penaltyFeeConfig > 0) ? penaltyFeeConfig : 0;
                // Display penalty: from DB if submitted, auto-calculated if not yet submitted and overdue
                const displayPenalty = payment.penalty_amount || autoCalculatedPenalty;
                return (
                <React.Fragment key={`${payment.period}-${idx}`}>
                  <div className="bg-white rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{payment.period} Payment</p>
                      <p className="text-sm text-slate-600">Amount Due: ₱{(payment.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      {displayPenalty > 0 && (
                        <p className="text-sm text-red-600 font-medium">+ Late Penalty Fee: ₱{displayPenalty.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      )}
                      {displayPenalty > 0 && (
                        <p className="text-sm font-semibold text-slate-900">Total: ₱{((payment.amount || 0) + displayPenalty).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      )}
                      <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>Due Date: {dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}{isOverdue ? ' (Overdue)' : ''}</p>
                      {isOverdue && payment.status === 'Not Started' && penaltyFeeConfig > 0 && (
                        <p className="text-xs text-red-500 mt-1">⚠ A late penalty fee of ₱{penaltyFeeConfig.toLocaleString('en-US', { minimumFractionDigits: 2 })} will be applied to this payment</p>
                      )}
                      <Badge className={`mt-2 ${
                        payment.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        payment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        payment.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {payment.status}
                      </Badge>
                      {payment.status === 'Rejected' && (
                        <p className="text-xs text-red-600 mt-2">Please resubmit your payment</p>
                      )}
                      {hasUnpaidPriorPenalty && (payment.status === 'Not Started' || payment.status === 'Rejected') && (
                        <p className="text-xs text-amber-600 mt-2">Pay outstanding penalty fees first before paying this period.</p>
                      )}
                    </div>
                    {canPayPeriod && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPenaltyPaymentAmount(null);
                          setSelectedInstallmentPeriod(payment.period);
                          setInstallmentPaymentOpen(true);
                        }}
                      >
                        Pay Now
                      </Button>
                    )}
                  </div>
                  {(payment.penalty_amount || 0) > 0 && payment.status !== 'Not Started' && (
                  <div className="rounded-lg p-4 flex items-center justify-between ml-4 bg-red-50 border border-red-200">
                    <div className="flex-1">
                      <p className="font-semibold text-red-800">Late Penalty Fee (included in payment)</p>
                      <p className="text-sm font-semibold text-red-700">₱{(payment.penalty_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  )}
                </React.Fragment>
                );
              })}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Enrollment Status</p>
            <p className="text-lg font-semibold text-slate-900">{enrollmentStatus || 'Not started'}</p>
            {currentEnrollment?.school_year && (
              <p className="text-sm text-slate-600">{currentEnrollment.school_year} • {currentEnrollment.semester}{studentProfile?.section ? ` • Section ${studentProfile.section}` : ''}</p>
            )}
          </Card>
          <Card className="p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Tuition & Fees</p>
            <p className="text-lg font-semibold text-slate-900">
              ₱{(assessmentData?.total_amount || assessmentData?.total || currentEnrollment?.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-slate-600">Paid: ₱{paymentHistory.reduce((sum: number, p: any) => sum + (p.amount_paid || p.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </Card>
          <Card className="p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Grades Status</p>
            <p className="text-lg font-semibold text-slate-900">{enrollmentDetails?.grades_status || 'Pending'}</p>
            <p className="text-sm text-slate-600">Subjects loaded: {currentCourses.length}</p>
          </Card>
        </div>

        {/* Current Courses */}
        <Card className="border-0 shadow-lg">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Current Enrolled Subjects</h3>
            {currentCourses.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No enrolled subjects</p>
            ) : (
              <div className="space-y-3">
                {currentCourses.map((course, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-blue-100 text-blue-700 border-0">
                            {course.code}
                          </Badge>
                          <span className="text-slate-900 font-medium">{course.name}</span>
                        </div>
                        <p className="text-sm text-slate-500">Instructor: {course.instructor}</p>
                        {/* Prefer explicit schedule on enrollment; otherwise show the first available schedule option for the subject */}
                        {(() => {
                          const inferred = (course.schedule && course.schedule.trim()) ? {
                            day_time: course.schedule,
                            room: course.room,
                            instructor: course.instructor
                          } : (course.scheduleOptions && course.scheduleOptions.length > 0 ? course.scheduleOptions[0] : null);

                          if (inferred) {
                            return (
                              <>
                                <p className="text-sm text-slate-500">Schedule: {inferred.day_time}</p>
                                {inferred.room && <p className="text-sm text-slate-500">Room: {inferred.room}</p>}
                              </>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <Badge variant="outline">{course.units} Units</Badge>
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

  const renderEnrollmentContent = () => {
    // Check if profile is complete for newly registered students
    const requiredProfileFields = [
      studentProfile?.first_name,
      studentProfile?.last_name,
      studentProfile?.email,
      studentProfile?.contact_number,
      studentProfile?.address,
      studentProfile?.birth_date,
      studentProfile?.gender,
      studentProfile?.course,
      studentProfile?.year_level,
      studentProfile?.section
    ];
    
    const isProfileIncomplete = requiredProfileFields.some(field => !field || field === '');
    
    // If no enrollment has been created yet and profile is incomplete, show profile completion message
    if (isProfileIncomplete && !currentEnrollment) {
      return (
        <Card className="border-0 shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Complete Your Profile First</h3>
          <p className="text-slate-600 mb-6">Before you can enroll, please complete your profile with all required information.</p>
          <Button 
            onClick={() => setActiveSection('My Profile')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            Complete Profile
          </Button>
        </Card>
      );
    }

    return (
      <div>
      {['Pending Assessment', 'For Admin Approval', 'For Registrar Assessment', 'Cashier Review', 'For Dean Approval', 'Payment Verification'].includes(enrollmentStatus) && (
        <Card className="border-0 shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
          <h3 className="text-xl mb-2">Enrollment {enrollmentStatus === 'Cashier Review' ? 'Under Cashier Review' : enrollmentStatus}</h3>
          <p className="text-slate-600 mb-4">{enrollmentStatus === 'Cashier Review' ? 'Your fees are being reviewed by the cashier. Please wait for approval.' : 'Your enrollment is being processed. Please wait for the next step.'}</p>
          <Badge className="bg-orange-100 text-orange-700 border-0">{enrollmentStatus}</Badge>
        </Card>
      )}

      {enrollmentStatus === 'For Subject Selection' && (
        <Card className="border-0 shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl mb-2">Select Your Subjects</h3>
          <p className="text-slate-600 mb-4">Your enrollment has been approved. Please select your subjects.</p>
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={() => setActiveSection('Subjects')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              Add Subjects
            </Button>
          </div>
        </Card>
      )}

      {enrollmentStatus === 'For Payment' && currentEnrollment && (
        <PaymentForm 
          enrollment={currentEnrollment}
          onViewAssessment={() => openAssessmentModal(currentEnrollment.id)}
          loadingAssessment={loadingAssessment}
          onSubmit={handleSubmitPayment}
          loading={loading}
        />
      )}

      {enrollmentStatus === 'Enrolled' && (
        <Card className="border-0 shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl mb-2 font-semibold">Enrollment Complete!</h3>
          <p className="text-slate-600 mb-6">You are now enrolled. View your schedule and download your enrollment documents.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button 
              onClick={() => setActiveSection('My Schedule')}
              style={{
                background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                color: 'white',
                opacity: downloadingCOR || downloadingForm ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!(downloadingCOR || downloadingForm)) {
                  e.currentTarget.style.background = 'linear-gradient(to right, #1d4ed8, #4338ca)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #2563eb, #4f46e5)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 rounded-md font-medium disabled:pointer-events-none cursor-pointer"
              disabled={downloadingCOR || downloadingForm}
            >
              <CalendarIcon className="h-4 w-4" />
              View Schedule
            </button>
            
            <button 
              onClick={async () => {
                try {
                  setDownloadingForm(true);
                  const response = await fetch('/api/student/enrollment/form', {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                  });
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Enrollment_Form.html';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  alert('Failed to download enrollment form');
                } finally {
                  setDownloadingForm(false);
                }
              }}
              style={{
                border: '1px solid #e2e8f0',
                background: 'white',
                color: '#1e293b',
                opacity: downloadingCOR || downloadingForm ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!(downloadingCOR || downloadingForm)) {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 rounded-md font-medium disabled:pointer-events-none cursor-pointer"
              disabled={downloadingCOR || downloadingForm}
            >
              {downloadingForm ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloadingForm ? 'Downloading...' : 'Download Form'}
            </button>
            
            <button 
              onClick={async () => {
                try {
                  setDownloadingCOR(true);
                  const response = await fetch('/api/student/enrollment/cor', {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                  });
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Certificate_of_Registration.html';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  alert('Failed to download Certificate of Registration');
                } finally {
                  setDownloadingCOR(false);
                }
              }}
              style={{
                background: 'linear-gradient(to right, #16a34a, #059669)',
                color: 'white',
                opacity: downloadingCOR || downloadingForm ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!(downloadingCOR || downloadingForm)) {
                  e.currentTarget.style.background = 'linear-gradient(to right, #15803d, #047857)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #16a34a, #059669)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 rounded-md font-medium disabled:pointer-events-none cursor-pointer"
              disabled={downloadingCOR || downloadingForm}
            >
              {downloadingCOR ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloadingCOR ? 'Downloading...' : 'Download COR'}
            </button>
          </div>
        </Card>
      )}

      {!['Pending Assessment', 'For Admin Approval', 'For Subject Selection', 'For Registrar Assessment', 'Cashier Review', 'For Dean Approval', 'For Payment', 'Payment Verification', 'Enrolled'].includes(enrollmentStatus) && (
        <Card className="border-0 shadow-lg p-6">
          <div className="mb-8 border-b pb-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-900">Scholarship Selection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="scholarship-type">Scholarship Type</Label>
                <Select value={scholarshipType} onValueChange={(v) => {
                  setScholarshipType(v);
                  if (v === 'None') setScholarshipLetter(null);
                }}>
                  <SelectTrigger id="scholarship-type" className="mt-2">
                    <SelectValue placeholder="Select scholarship type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHOLAR_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {scholarshipType !== 'None' && (
                <div className="space-y-3">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Scholarship Letter Template</Label>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => window.open(getDocDownloadUrl('scholarship_letter'), '_blank')}>
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">Download the scholarship letter template</p>
                  </div>
                  
                  <DocumentUpload
                    label="Scholarship Letter"
                    description="Upload your official scholarship letter or certificate"
                    docType="scholarship_letter"
                    onFileSelect={(_type, file) => setScholarshipLetter(file)}
                    selectedFile={scholarshipLetter as any}
                    acceptedFormats=".pdf,.jpg,.jpeg,.png"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Student Type Display (auto-set by admin) */}
          {enrollmentStep === 1 && (
            <div className="space-y-4">
              {resolvedStudentType ? (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertTitle className="text-blue-900">Student Type: {studentProfile?.student_type || enrollmentDetails?.student_type || currentEnrollment?.student_type}</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    Your enrollment type has been set by the administrator. Click Continue to proceed.
                  </AlertDescription>
                </Alert>
              ) : (
                <div>
                  <Label htmlFor="student-type">Select Student Type</Label>
                  <Select value={studentType} onValueChange={setStudentType}>
                    <SelectTrigger id="student-type" className="mt-2">
                      <SelectValue placeholder="Choose student type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Student</SelectItem>
                      <SelectItem value="transferee">Transferee</SelectItem>
                      <SelectItem value="returning">Returning Student</SelectItem>
                      <SelectItem value="continuing">Continuing Student</SelectItem>
                      <SelectItem value="scholar">Scholar Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(resolvedStudentType || studentType) && (
                <Button 
                  onClick={() => setEnrollmentStep(2)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {resolvedStudentType ? 'Continue' : 'Next'}
                </Button>
              )}
            </div>
          )}

          {/* New Student */}
          {enrollmentStep === 2 && studentType === 'new' && (
            <div className="space-y-4">
              <h3 className="text-lg mb-4">New Student - Upload Requirements</h3>

              <DocumentUpload
                label="Diploma"
                description="Upload your high school diploma or certificate of graduation"
                docType="diploma"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['diploma']}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="2x2 Picture"
                description="Upload a 2x2 passport-sized picture"
                docType="picture_2x2"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['picture_2x2']}
                acceptedFormats=".jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Form 137/TOR (Optional)"
                description="Upload your Form 137 (Report Card) or Transcript of Records"
                docType="form137"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['form137']}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Form 138 / Report Card (Optional)"
                description="Upload your Form 138 or Report Card"
                docType="form138"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['form138']}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Birth Certificate (Optional)"
                description="Upload a copy of your Birth Certificate"
                docType="birth_certificate"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['birth_certificate']}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Good Moral Certificate (Optional)"
                description="Upload your Good Moral Certificate"
                docType="moral_certificate"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['moral_certificate']}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Clearance Form"
                description="Upload your Clearance Form from previous school"
                docType="clearance_form"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['clearance_form']}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Download Admission Forms</Label>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => window.open(getDocDownloadUrl('scholarship_application'), '_blank')}>
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Download and fill out the admission forms</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6 mb-4">
                <h4 className="font-medium text-amber-900 mb-2">Submission Options</h4>
                <div className="space-y-2 text-sm text-amber-800">
                  <p><strong>To Follow:</strong> Use this button if you have incomplete documents. You can submit your enrollment now and complete the remaining documents later.</p>
                  <p><strong>Submit for Assessment:</strong> Use this button when you have submitted all required documents. Your enrollment will proceed to the assessment phase.</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setEnrollmentStep(1)}>Back</Button>
                {!areDocumentsComplete('New') && (
                  <Button variant="secondary" onClick={() => {
                    if (requiresSubjectSelection()) { setEnrollmentStep(3); loadEnrollmentSubjects(); }
                    else { handleSubmitForAssessment(); }
                  }} disabled={submitting}>
                    {submitting ? 'Submitting...' : requiresSubjectSelection() ? 'To Follow — Proceed to Subject Selection' : 'To Follow'}
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    if (requiresSubjectSelection()) { setEnrollmentStep(3); loadEnrollmentSubjects(); }
                    else { handleSubmitForAssessment(); }
                  }}
                  disabled={!areDocumentsComplete('New') || submitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {requiresSubjectSelection() ? 'Proceed to Subject Selection' : (submitting ? 'Submitting...' : 'Submit for Assessment')}
                </Button>
              </div>
            </div>
          )}

          {/* Transferee */}
          {enrollmentStep === 2 && studentType === 'transferee' && (
            <div className="space-y-4">
              <h3 className="text-lg mb-4">Transferee - Upload Requirements</h3>
              
              <DocumentUpload
                label="Transcript of Records (TOR)"
                description="Upload your official TOR from previous school"
                docType="tor"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['tor']}
                downloadUrl={getDocDownloadUrl('tor')}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Certificate of Transfer"
                description="Upload your Certificate of Transfer/Honorable Dismissal"
                docType="certificate_transfer"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['certificate_transfer']}
                downloadUrl={getDocDownloadUrl('certificate_transfer')}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Birth Certificate (Optional)"
                description="Upload a copy of your Birth Certificate"
                docType="birth_certificate"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['birth_certificate']}
                downloadUrl={getDocDownloadUrl('birth_certificate')}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Good Moral Certificate (Optional)"
                description="Upload your Good Moral Certificate"
                docType="moral_certificate"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['moral_certificate']}
                downloadUrl={getDocDownloadUrl('moral_certificate')}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Clearance Form"
                description="Upload your Clearance Form from previous school"
                docType="clearance_form"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['clearance_form']}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6 mb-4">
                <h4 className="font-medium text-amber-900 mb-2">Submission Options</h4>
                <div className="space-y-2 text-sm text-amber-800">
                  <p><strong>To Follow:</strong> Use this button if you have incomplete documents. You can submit your enrollment now and complete the remaining documents later.</p>
                  <p><strong>Submit for Assessment:</strong> Use this button when you have submitted all required documents. Your enrollment will proceed to the assessment phase.</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setEnrollmentStep(1)}>Back</Button>
                {!areDocumentsComplete('Transferee') && (
                  <Button variant="secondary" onClick={() => { setEnrollmentStep(3); loadEnrollmentSubjects(); }} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'To Follow — Proceed to Subject Selection'}
                  </Button>
                )}
                <Button 
                  onClick={() => { setEnrollmentStep(3); loadEnrollmentSubjects(); }}
                  disabled={!areDocumentsComplete('Transferee') || submitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  Proceed to Subject Selection
                </Button>
              </div>
            </div>
          )}

          {/* Returning Student */}
          {enrollmentStep === 2 && studentType === 'returning' && (
            <div className="space-y-4">
              <h3 className="text-lg mb-4">Returning Student - Upload Requirements</h3>
              
              <DocumentUpload
                label="Form 137 / Transcript of Records"
                description="Upload your Form 137 (Report Card) or Transcript of Records"
                docType="form137"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['form137']}
                downloadUrl={getDocDownloadUrl('form137')}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Birth Certificate (Optional)"
                description="Upload your birth certificate"
                docType="birth_certificate"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['birth_certificate']}
                downloadUrl={getDocDownloadUrl('birth_certificate')}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Clearance Form"
                description="Upload your Clearance Form"
                docType="clearance_form"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['clearance_form']}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6 mb-4">
                <h4 className="font-medium text-amber-900 mb-2">Submission Options</h4>
                <div className="space-y-2 text-sm text-amber-800">
                  <p><strong>To Follow:</strong> Use this button if you have incomplete documents. You can submit your enrollment now and complete the remaining documents later.</p>
                  <p><strong>Submit for Assessment:</strong> Use this button when you have submitted all required documents. Your enrollment will proceed to the assessment phase.</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setEnrollmentStep(1)}>Back</Button>
                {!areDocumentsComplete('Returning') && (
                  <Button variant="secondary" onClick={() => {
                    if (requiresSubjectSelection()) { setEnrollmentStep(3); loadEnrollmentSubjects(); }
                    else { handleSubmitForAssessment(); }
                  }} disabled={submitting}>
                    {submitting ? 'Submitting...' : requiresSubjectSelection() ? 'To Follow — Proceed to Subject Selection' : 'To Follow'}
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    if (requiresSubjectSelection()) { setEnrollmentStep(3); loadEnrollmentSubjects(); }
                    else { handleSubmitForAssessment(); }
                  }}
                  disabled={!areDocumentsComplete('Returning') || submitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {requiresSubjectSelection() ? 'Proceed to Subject Selection' : (submitting ? 'Submitting...' : 'Submit for Assessment')}
                </Button>
              </div>
            </div>
          )}

          {/* Continuing Student */}
          {enrollmentStep === 2 && studentType === 'continuing' && (
            <div className="space-y-4">
              <h3 className="text-lg mb-4">Continuing Student - Upload Requirements</h3>

              <DocumentUpload
                label="Clearance Form"
                description="Upload your Clearance Form"
                docType="clearance_form"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['clearance_form']}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="mb-2">Previous Term Data</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-slate-600">Term:</span> 1st Semester 2023-2024</p>
                  <p><span className="text-slate-600">Program:</span> BSIT</p>
                  <p><span className="text-slate-600">Year Level:</span> 2nd Year</p>
                  <p><span className="text-slate-600">GPA:</span> 3.5</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6 mb-4">
                <h4 className="font-medium text-amber-900 mb-2">Submission Options</h4>
                <div className="space-y-2 text-sm text-amber-800">
                  <p><strong>To Follow:</strong> Use this button if you have incomplete documents. You can submit your enrollment now and complete the remaining documents later.</p>
                  <p><strong>Submit for Assessment:</strong> Use this button when you have submitted all required documents. Your enrollment will proceed to the assessment phase.</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setEnrollmentStep(1)}>Back</Button>
                {!areDocumentsComplete('Continuing') && (
                  <Button variant="secondary" onClick={() => {
                    if (requiresSubjectSelection()) { setEnrollmentStep(3); loadEnrollmentSubjects(); }
                    else { handleSubmitForAssessment(); }
                  }} disabled={submitting}>
                    {submitting ? 'Submitting...' : requiresSubjectSelection() ? 'To Follow — Proceed to Subject Selection' : 'To Follow'}
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    if (requiresSubjectSelection()) { setEnrollmentStep(3); loadEnrollmentSubjects(); }
                    else { handleSubmitForAssessment(); }
                  }}
                  disabled={!areDocumentsComplete('Continuing') || submitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {requiresSubjectSelection() ? 'Proceed to Subject Selection' : (submitting ? 'Submitting...' : 'Submit for Assessment')}
                </Button>
              </div>
            </div>
          )}

          {/* Scholar Student */}
          {enrollmentStep === 2 && studentType === 'scholar' && (
            <div className="space-y-4">
              <h3 className="text-lg mb-4">Scholar Student - Upload Requirements</h3>

              {scholarshipType === 'None' && (
                <>
                  <DocumentUpload
                    label="Form 137 / Transcript of Records"
                    description="Upload your Form 137 (Report Card) or Transcript of Records"
                    docType="form137"
                    onFileSelect={handleDocumentUpload}
                    selectedFile={uploadedDocuments['form137']}
                    acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />

                  <DocumentUpload
                    label="Form 138 / Report Card"
                    description="Upload your Form 138 (Report Card) or Transcript of Records"
                    docType="form138"
                    onFileSelect={handleDocumentUpload}
                    selectedFile={uploadedDocuments['form138']}
                    acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </>
              )}

              <DocumentUpload
                label="Birth Certificate (Optional)"
                description="Upload a copy of your Birth Certificate"
                docType="birth_certificate"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['birth_certificate']}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Good Moral Certificate (Optional)"
                description="Upload your Good Moral Certificate"
                docType="moral_certificate"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['moral_certificate']}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              <DocumentUpload
                label="Clearance Form"
                description="Upload your Clearance Form from previous school"
                docType="clearance_form"
                onFileSelect={handleDocumentUpload}
                selectedFile={uploadedDocuments['clearance_form']}
                acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              {scholarshipType !== 'None' && (
                <>
                  <DocumentUpload
                    label="Scholarship Application Form"
                    description="Upload completed scholarship application"
                    docType="scholarship_application"
                    onFileSelect={handleDocumentUpload}
                    selectedFile={uploadedDocuments['scholarship_application']}
                    downloadUrl={getDocDownloadUrl('scholarship_application')}
                    acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />

                  <div className="border rounded-lg p-4 bg-slate-50">
                    <div className="mb-3">
                      <Label htmlFor="scholarship-docs" className="text-base font-medium">Scholarship Supporting Documents</Label>
                      <p className="text-sm text-slate-600 mt-1">Upload multiple supporting documents for your scholarship application</p>
                    </div>
                    <input
                      id="scholarship-docs"
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.currentTarget.files || []);
                        setScholarshipSupportingDocs([...scholarshipSupportingDocs, ...files]);
                      }}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="block w-full text-sm text-slate-500 file:mr-2 file:px-3 file:py-2 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {scholarshipSupportingDocs.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium">Uploaded files ({scholarshipSupportingDocs.length}):</p>
                        <ul className="space-y-1">
                          {scholarshipSupportingDocs.map((file, idx) => (
                            <li key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-slate-200">
                              <span className="truncate">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => setScholarshipSupportingDocs(scholarshipSupportingDocs.filter((_, i) => i !== idx))}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <DocumentUpload
                    label="DTR (Daily Time Record) Form"
                    description="Upload your DTR (Daily Time Record) form"
                    docType="dtr_form"
                    onFileSelect={handleDocumentUpload}
                    selectedFile={uploadedDocuments['dtr_form']}
                    acceptedFormats=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Download Admission Forms</Label>
                  {scholarshipType !== 'None' && (
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => window.open(getDocDownloadUrl('scholarship_application'), '_blank')}>
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">Download and fill out the admission forms</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6 mb-4">
                <h4 className="font-medium text-amber-900 mb-2">Submission Options</h4>
                <div className="space-y-2 text-sm text-amber-800">
                  <p><strong>To Follow:</strong> Use this button if you have incomplete documents. You can submit your enrollment now and complete the remaining documents later.</p>
                  <p><strong>Submit for Assessment:</strong> Use this button when you have submitted all required documents. Your enrollment will proceed to the assessment phase.</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setEnrollmentStep(1)}>Back</Button>
                {!areDocumentsComplete('Scholar') && (
                  <Button variant="secondary" onClick={() => {
                    if (requiresSubjectSelection()) { setEnrollmentStep(3); loadEnrollmentSubjects(); }
                    else { handleSubmitForAssessment(); }
                  }} disabled={submitting}>
                    {submitting ? 'Submitting...' : requiresSubjectSelection() ? 'To Follow — Proceed to Subject Selection' : 'To Follow'}
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    if (requiresSubjectSelection()) { setEnrollmentStep(3); loadEnrollmentSubjects(); }
                    else { handleSubmitForAssessment(); }
                  }}
                  disabled={!areDocumentsComplete('Scholar') || submitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {requiresSubjectSelection() ? 'Proceed to Subject Selection' : (submitting ? 'Submitting...' : 'Submit for Assessment')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Step 3: Subject Selection (Transferee & Irregular Students) */}
      {enrollmentStep === 3 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Step 3: Subject Selection
          </h3>

          {/* Advising Instructions */}
          <Alert className="mb-6 border-amber-300 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 font-semibold">Important: Face-to-Face Advising Required</AlertTitle>
            <AlertDescription className="text-amber-700">
              Students must complete the advising of subjects, including any adding or dropping of subjects, through a face-to-face consultation with the Registrar or academic adviser. This process must be completed before proceeding with the online enrollment in the system.
            </AlertDescription>
          </Alert>

          <p className="text-sm text-slate-600 mb-4">
            Select the subjects you have been advised to take this semester. Only select subjects that have been approved during your advising session.
          </p>

          {loadingEnrollSubjects ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-slate-500">Loading available subjects...</span>
            </div>
          ) : enrollAvailableSubjects.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500">No subjects found for your course. Please contact the Registrar.</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 text-left w-10"></th>
                      <th className="p-3 text-left">Subject Code</th>
                      <th className="p-3 text-left">Subject Name</th>
                      <th className="p-3 text-center">Units</th>
                      <th className="p-3 text-center">Year Level</th>
                      <th className="p-3 text-center">Semester</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollAvailableSubjects.map((subject: any) => {
                      const isSelected = enrollSubjectsSelection.includes(subject.id);
                      return (
                        <tr
                          key={subject.id}
                          className={`border-t cursor-pointer hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}
                          onClick={() => toggleEnrollSubject(subject.id)}
                        >
                          <td className="p-3 text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleEnrollSubject(subject.id)}
                            />
                          </td>
                          <td className="p-3 font-mono font-medium">{subject.subject_code}</td>
                          <td className="p-3">{subject.subject_name}</td>
                          <td className="p-3 text-center">{subject.units}</td>
                          <td className="p-3 text-center">{subject.year_level || '-'}</td>
                          <td className="p-3 text-center">{subject.semester || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="mt-4 flex items-center justify-between bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{enrollSubjectsSelection.length}</span> subject(s) selected
                  {' · '}
                  <span className="font-medium text-slate-800">
                    {enrollAvailableSubjects
                      .filter((s: any) => enrollSubjectsSelection.includes(s.id))
                      .reduce((sum: number, s: any) => sum + (Number(s.units) || 0), 0)}
                  </span> total units
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setEnrollmentStep(2)}>Back</Button>
            <Button
              onClick={handleSubmitForAssessment}
              disabled={submitting || enrollSubjectsSelection.length === 0}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                `Submit for Assessment (${enrollSubjectsSelection.length} subjects)`
              )}
            </Button>
          </div>
        </Card>
      )}
      </div>
    );
  };

  const renderSubjectsContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    const totalUnits = currentCourses.reduce((sum: number, c: any) => sum + (c.units || 0), 0);

    return (
      <div>
        <Card className="border-0 shadow-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-1">Enrolled Subjects</h3>
            <p className="text-slate-500 text-sm">Subjects assigned by the Registrar and approved by the Dean.</p>
          </div>

          {currentCourses.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-sm">No subjects have been assigned to your enrollment yet.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {currentCourses.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                    <div>
                      <p className="font-semibold text-sm">{c.code}</p>
                      <p className="text-xs text-slate-500">{c.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{c.units} units</Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between text-sm font-semibold text-slate-700">
                <span>Total Units</span>
                <span>{totalUnits}</span>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  };

  const renderGradesContent = () => {
    return (
      <Card className="border-0 shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Grades</h3>
        {loadingGrades ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : grades.length === 0 ? (
          <p className="text-sm text-slate-500">No grades available.</p>
        ) : (
          <div className="space-y-3">
            {grades.map((g: any, i: number) => (
              <div key={i} className="p-3 border rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium">{g.subject_code} — {g.subject_name}</div>
                  <div className="text-xs text-slate-500">{g.school_year} • {g.semester}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{g.grade ?? 'N/A'}</div>
                  <div className="text-xs text-slate-400">{g.status || ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  const renderScheduleContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    // Group schedule by day for better display
    const scheduleByDay: Record<string, any[]> = {};
    currentCourses.forEach((course: any) => {
      if (course.schedule) {
        const parts = course.schedule.split(' ');
        const day = parts[0] || 'TBA';
        const time = parts.slice(1).join(' ') || 'TBA';
        if (!scheduleByDay[day]) {
          scheduleByDay[day] = [];
        }
        scheduleByDay[day].push({
          code: course.code,
          name: course.name,
          time,
          room: course.room || 'TBA',
          instructor: course.instructor || 'TBA'
        });
      }
    });

    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedDays = Object.keys(scheduleByDay).sort((a, b) => {
      const aIndex = daysOrder.indexOf(a);
      const bIndex = daysOrder.indexOf(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return (
      <div>
        <Card className="border-0 shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">My Class Schedule</h3>
          
          {currentEnrollment && (
            <div className="mb-6 text-sm text-slate-600">
              <p>School Year: {currentEnrollment.school_year || 'N/A'}</p>
              <p>Semester: {currentEnrollment.semester || 'N/A'}</p>
            </div>
          )}

          {sortedDays.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No schedule available</p>
          ) : (
            <div className="space-y-4">
              {sortedDays.map((day) => (
                <div key={day} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">{day}</h4>
                  <div className="space-y-2">
                    {scheduleByDay[day].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-100 text-blue-700 border-0">{item.code}</Badge>
                            <span className="text-slate-900">{item.name}</span>
                          </div>
                          <p className="text-sm text-slate-500">
                            {item.time} • Room: {item.room} • Instructor: {item.instructor}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderTuitionFeesContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    return (
      <div>
        <Card className="border-0 shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3">Tuition and Fees</h3>
          <div className="text-sm text-slate-700 mb-4">
            <div className="flex justify-between"><span>Total Assessment</span><span>₱{(assessmentData?.total || assessmentData?.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span>Amount Due</span><span>₱{(assessmentData?.due || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
          </div>

          {currentEnrollment ? (
            (currentEnrollment.status === 'Ready for Payment' || currentEnrollment.status === 'For Payment') ? (
              <PaymentForm 
                enrollment={currentEnrollment}
                onViewAssessment={() => openAssessmentModal(currentEnrollment.id)}
                loadingAssessment={loadingAssessment}
                onSubmit={handleSubmitPayment}
                loading={loading}
              />
            ) : (
              <div className="text-sm text-slate-600">
                <p>Current enrollment status: <strong>{currentEnrollment.status}</strong></p>
                <p className="mt-2">If your assessment is approved and marked Ready for Payment, you will be able to upload a payment receipt here.</p>
              </div>
            )
          ) : (
            <p className="text-sm text-slate-500">No active enrollment found.</p>
          )}
        </Card>

        <Card className="border-0 shadow-lg p-6">
          <h4 className="text-lg font-medium mb-3">Payment History</h4>
          {paymentHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No payments found</p>
          ) : (
            <div className="space-y-3 text-sm">
              {paymentHistory.map((p: any) => (
                <div key={p.id} className={`border rounded p-3 ${
                  p.status === 'Approved' || p.status === 'Completed' || p.approved_at 
                    ? 'bg-green-50 border-green-200' 
                    : p.status === 'Pending' 
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{p.method || p.reference || 'Payment'}</div>
                        <Badge className={`text-xs ${
                          p.status === 'Approved' || p.status === 'Completed' || p.approved_at 
                            ? 'bg-green-100 text-green-800' 
                            : p.status === 'Pending' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {p.status === 'Approved' || p.approved_at ? 'Approved' : p.status === 'Completed' ? 'Verified' : p.status || 'Pending'}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Submitted: {new Date(p.ts || p.created_at).toLocaleString()}
                      </div>
                      {(p.approved_at || p.approved_by) && (
                        <div className="text-xs text-slate-600">
                          Approved: {new Date(p.approved_at).toLocaleString()} {p.approved_by ? `by ${p.approved_by}` : ''}
                        </div>
                      )}
                      {p.reference && (
                        <div className="text-xs text-slate-600">
                          Ref: {p.reference}
                        </div>
                      )}
                      {p.remarks && (
                        <div className="text-xs text-slate-700 mt-1">
                          Remarks: {p.remarks}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₱{(p.amount || p.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                  {/* Always show download receipt button for any payment */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-blue-600 hover:bg-blue-50 border-blue-200"
                      onClick={() => handleDownloadReceipt(p)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      {p.status === 'Approved' || p.status === 'Completed' || p.approved_at ? 'Download Receipt' : 'Download Confirmation'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Remaining Installments Section - Show only if there are unpaid installment periods */}
        {enrollmentStatus === 'Enrolled' && installmentSchedule.length > 0 && hasDownPayment && (
          <Card className="border border-blue-200 bg-blue-50 p-6 shadow-lg mt-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Remaining Installment Payments</h3>
            <p className="text-sm text-slate-600 mb-4">You have paid the down payment. Below is your remaining balance to pay:</p>
            <div className="space-y-4">
              {installmentSchedule.map((payment: any, idx: number) => {
                const periodOffset: Record<string, number> = { 'Prelim Period': 1, 'Midterm Period': 2, 'Finals Period': 3 };
                const enrollDate = new Date(currentEnrollment?.enrollment_date || currentEnrollment?.created_at);
                const dueDate = new Date(enrollDate);
                dueDate.setMonth(dueDate.getMonth() + (periodOffset[payment.period] ?? (idx + 1)));
                const isOverdue = new Date() > dueDate && payment.status !== 'Approved';
                // Check if any previous period has an unpaid penalty (blocks paying next periods)
                const hasUnpaidPriorPenalty = installmentSchedule.slice(0, idx).some((prev: any) => (prev.penalty_amount || 0) > 0);
                const canPayPeriod = !hasUnpaidPriorPenalty && (payment.status === 'Not Started' || payment.status === 'Rejected');
                // Auto-calculated penalty for overdue periods not yet submitted
                const autoCalculatedPenalty = (isOverdue && payment.status === 'Not Started' && penaltyFeeConfig > 0) ? penaltyFeeConfig : 0;
                // Display penalty: from DB if submitted, auto-calculated if not yet submitted and overdue
                const displayPenalty = payment.penalty_amount || autoCalculatedPenalty;
                return (
                <React.Fragment key={`${payment.period}-${idx}`}>
                  <div className="bg-white rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{payment.period} Payment</p>
                      <p className="text-sm text-slate-600">Amount Due: ₱{(payment.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      {displayPenalty > 0 && (
                        <p className="text-sm text-red-600 font-medium">+ Late Penalty Fee: ₱{displayPenalty.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      )}
                      {displayPenalty > 0 && (
                        <p className="text-sm font-semibold text-slate-900">Total: ₱{((payment.amount || 0) + displayPenalty).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      )}
                      <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>Due Date: {dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}{isOverdue ? ' (Overdue)' : ''}</p>
                      {isOverdue && payment.status === 'Not Started' && penaltyFeeConfig > 0 && (
                        <p className="text-xs text-red-500 mt-1">⚠ A late penalty fee of ₱{penaltyFeeConfig.toLocaleString('en-US', { minimumFractionDigits: 2 })} will be applied to this payment</p>
                      )}
                      <Badge className={`mt-2 ${
                        payment.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        payment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        payment.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {payment.status}
                      </Badge>
                      {payment.status === 'Rejected' && (
                        <p className="text-xs text-red-600 mt-2">Please resubmit your payment</p>
                      )}
                      {hasUnpaidPriorPenalty && (payment.status === 'Not Started' || payment.status === 'Rejected') && (
                        <p className="text-xs text-amber-600 mt-2">Pay outstanding penalty fees first before paying this period.</p>
                      )}
                    </div>
                    {canPayPeriod && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPenaltyPaymentAmount(null);
                          setSelectedInstallmentPeriod(payment.period);
                          setInstallmentPaymentOpen(true);
                        }}
                      >
                        Pay Now
                      </Button>
                    )}
                  </div>
                  {(payment.penalty_amount || 0) > 0 && payment.status !== 'Not Started' && (
                  <div className="rounded-lg p-4 flex items-center justify-between ml-4 bg-red-50 border border-red-200">
                    <div className="flex-1">
                      <p className="font-semibold text-red-800">Late Penalty Fee (included in payment)</p>
                      <p className="text-sm font-semibold text-red-700">₱{(payment.penalty_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  )}
                </React.Fragment>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderProfileContent = () => {
    if (loading || !studentProfile) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    return (
      <div>
        <Card className="border-0 shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-6">My Profile</h3>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="text-md font-medium mb-4">Personal Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="profile-first-name">First Name</Label>
                  <Input 
                    id="profile-first-name"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="profile-last-name">Last Name</Label>
                  <Input 
                    id="profile-last-name"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="profile-middle-name">Middle Name</Label>
                  <Input 
                    id="profile-middle-name"
                    value={profileForm.middle_name}
                    onChange={(e) => setProfileForm({ ...profileForm, middle_name: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="profile-birth-date">Birth Date</Label>
                  <Input 
                    id="profile-birth-date"
                    type="date"
                    value={profileForm.birth_date ? profileForm.birth_date.split('T')[0] : ''}
                    onChange={(e) => setProfileForm({ ...profileForm, birth_date: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="profile-gender">Gender</Label>
                  <Select
                    value={profileForm.gender}
                    onValueChange={(value) => setProfileForm({ ...profileForm, gender: value })}
                  >
                    <SelectTrigger id="profile-gender" className="mt-2">
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
                  <Label htmlFor="profile-email">Email</Label>
                  <Input 
                    id="profile-email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="profile-contact">Contact Number</Label>
                  <Input 
                    id="profile-contact"
                    value={profileForm.contact_number}
                    onChange={(e) => setProfileForm({ ...profileForm, contact_number: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium mb-4">Contact Information</h4>
              <div>
                <Label htmlFor="profile-address">Address</Label>
                <Input 
                  id="profile-address"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Account Credentials */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium mb-4">Account Credentials</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="profile-username">Username</Label>
                  <Input 
                    id="profile-username"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    className="mt-2"
                    placeholder="Enter username"
                  />
                </div>
              </div>
            </div>

            {/* Password Change */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium mb-4">Change Password</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="mt-2"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input 
                    id="confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="mt-2"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleChangePassword}
                disabled={loading || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </div>

            {/* Academic Information */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium mb-4">Academic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="profile-course">Course</Label>
                  <Select
                    value={profileForm.course || ''}
                    onValueChange={(value) => setProfileForm({ ...profileForm, course: value })}
                  >
                    <SelectTrigger id="profile-course" className="mt-2">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCourses.map((course) => (
                        <SelectItem key={course} value={course}>{course}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="profile-year-level">Year Level</Label>
                  <Select
                    value={(profileForm.year_level || '').toString()}
                    onValueChange={(value) => setProfileForm({ ...profileForm, year_level: value ? parseInt(value) : undefined })}
                  >
                    <SelectTrigger id="profile-year-level" className="mt-2">
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
                  <Label htmlFor="profile-section">Class Section</Label>
                  <Select
                    value={profileForm.section || undefined}
                    onValueChange={(value) => setProfileForm({ ...profileForm, section: value })}
                  >
                    <SelectTrigger id="profile-section" className="mt-2">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Section 1</SelectItem>
                      <SelectItem value="2">Section 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Student Information (Read-only) */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium mb-4">Student Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Student ID</p>
                  <p className="font-medium">{studentProfile.student_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Student Type</p>
                  <p className="font-medium">{studentProfile.student_type || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-6">
              <Button 
                variant="outline"
                onClick={() => {
                  setProfileForm({
                    first_name: studentProfile.first_name || '',
                    middle_name: studentProfile.middle_name || '',
                    last_name: studentProfile.last_name || '',
                    suffix: studentProfile.suffix || '',
                    contact_number: studentProfile.contact_number || '',
                    address: studentProfile.address || '',
                    birth_date: studentProfile.birth_date || '',
                    gender: studentProfile.gender || '',
                    username: studentProfile.username || '',
                    course: studentProfile.course || '',
                    year_level: studentProfile.year_level || undefined,
                    section: studentProfile.section || ''
                  });
                }}
              >
                Reset
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile Changes'
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-white border-r border-slate-200 shadow-xl flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm text-slate-900">IC Northgate</h3>
                <p className="text-xs text-slate-500">Student Portal</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            <button
              onClick={() => setActiveSection('Dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                activeSection === 'Dashboard' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
            
            <button
              onClick={() => {
                setActiveSection('Enroll');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                activeSection === 'Enroll' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ClipboardCheck className="h-4 w-4" />
              Enroll
              {enrollmentStatus !== 'none' && enrollmentStatus !== 'Enrolled' && (
                <Badge className="ml-auto bg-orange-500 text-white border-0 text-xs px-1.5 py-0">
                  {enrollmentStatus}
                </Badge>
              )}
            </button>
            
            <button
              onClick={() => setActiveSection('Subjects')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                activeSection === 'Subjects' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Subjects
            </button>
            <button
              onClick={() => setActiveSection('Tuition and Fees')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                activeSection === 'Tuition and Fees' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="h-4 w-4 flex items-center text-sm">₱</span>
              Tuition and Fees
            </button>

            <button
              onClick={() => setActiveSection('My Schedule')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                activeSection === 'My Schedule' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              My Schedule
            </button>

              <button
                onClick={() => setActiveSection('Grades')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                  activeSection === 'Grades'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Grades
              </button>

            <button
              onClick={() => setActiveSection('My Profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                activeSection === 'My Profile' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <UserCircle className="h-4 w-4" />
              My Profile
            </button>
          </nav>

          <div className="p-3 border-t border-slate-200">
            <Button 
              variant="outline" 
              className="w-full justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 h-9 text-sm"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl mb-1">
                  {activeSection === 'Dashboard' && 'Student Dashboard'}
                  {activeSection === 'Enroll' && 'Enroll'}
                  {activeSection === 'Subjects' && 'Subjects'}
                  {activeSection === 'My Schedule' && 'My Schedule'}
                  {activeSection === 'Tuition and Fees' && 'Tuition and Fees'}
                  {activeSection === 'Grades' && 'Grades'}
                  {activeSection === 'My Profile' && 'My Profile'}
                </h1>
                <p className="text-sm text-slate-600">
                  {activeSection === 'Dashboard' && 'Welcome back to your learning portal'}
                  {activeSection === 'Enroll' && 'Manage your enrollment and course registration'}
                  {activeSection === 'Subjects' && 'View and manage your enrolled subjects'}
                  {activeSection === 'My Schedule' && 'Check your class schedule and room assignments'}
                  {activeSection === 'Tuition and Fees' && 'Track your tuition payments and balance'}
                  {activeSection === 'Grades' && 'Review your academic grades and performance'}
                  {activeSection === 'My Profile' && 'Update your personal information and account settings'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleViewNotification}
                  className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5 text-slate-600" />
                  {hasNewNotification && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
                <div className="text-right">
                  <p className="text-xs text-slate-600">Student ID: {studentProfile?.student_id || 'N/A'}</p>
                  <p className="text-xs text-slate-500">{(studentProfile?.course ? `${studentProfile.course} - ` : '') + (studentProfile?.year_level ? `${studentProfile.year_level}${getOrdinalSuffix(studentProfile.year_level)} Year` : '')}{studentProfile?.section ? ` • Section ${studentProfile.section}` : ''}</p>
                  {studentProfile?.student_classification && (
                    <Badge className={studentProfile.student_classification === 'Irregular' ? 'bg-amber-100 text-amber-700 border-0 mt-1' : 'bg-blue-100 text-blue-700 border-0 mt-1'}>
                      {studentProfile.student_classification}
                    </Badge>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>

            {/* Stats Grid - Only on Dashboard */}
            {activeSection === 'Dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={index} className="p-4 border-0 shadow-lg hover:shadow-xl transition-all bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <h3 className="text-2xl mb-1">{stat.value}</h3>
                      <p className="text-xs text-slate-600">{stat.label}</p>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Dynamic Content */}
            {activeSection === 'Dashboard' && renderDashboardContent()}
            {activeSection === 'Enroll' && renderEnrollmentContent()}
            {activeSection === 'Subjects' && renderSubjectsContent()}
            {activeSection === 'My Schedule' && renderScheduleContent()}
            {activeSection === 'My Profile' && renderProfileContent()}
            {activeSection === 'Tuition and Fees' && renderTuitionFeesContent()}
            {activeSection === 'Grades' && renderGradesContent && renderGradesContent()}
            {/* Notifications Modal */}
            <Dialog open={showNotification} onOpenChange={setShowNotification}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Notifications ({notifications.length})</DialogTitle>
                  <DialogDescription>Recent updates about your enrollment and payments.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '60vh' }}>
                  {notificationsLoading && (
                    <p className="text-sm text-slate-500 text-center">Loading notifications...</p>
                  )}
                  {!notificationsLoading && notifications.length === 0 && (
                    <p className="text-sm text-slate-500 text-center">No notifications yet.</p>
                  )}
                  {!notificationsLoading && notifications.map((notice: any, idx: number) => (
                    <div key={notice.id || idx} className={`p-3 border rounded-lg ${!notice.is_read ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm">{notice.title}</p>
                            {!notice.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                          </div>
                          <p className="text-sm text-slate-600">{notice.message}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {notice.created_at ? new Date(notice.created_at).toLocaleString() : 'Just now'}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                          notice.type === 'success' ? 'bg-green-100 text-green-700' :
                          notice.type === 'warning' ? 'bg-orange-100 text-orange-700' :
                          notice.type === 'error' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {notice.type}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="outline" onClick={() => setShowNotification(false)}>Close</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Payments Modal */}
            <Dialog open={paymentsOpen} onOpenChange={setPaymentsOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Tuition Assessment & Payments</DialogTitle>
                  <DialogDescription>Review your tuition assessment and payment history.</DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium">Assessment</h4>
                    <div className="mt-2 text-sm">
                      <div className="flex justify-between"><div>Total</div><div>₱{(assessmentData?.total || assessmentData?.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
                      <div className="flex justify-between"><div>Due</div><div>₱{(assessmentData?.due || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium">Payment History</h4>
                    {paymentHistory.length === 0 ? (
                      <p className="text-sm text-slate-500 mt-2">No payments found</p>
                    ) : (
                      <div className="mt-2 space-y-2 text-sm">
                        {paymentHistory.map((p: any) => (
                          <div key={p.id} className={`border rounded p-3 ${
                            p.status === 'Approved' || p.status === 'Completed' || p.approved_at 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{p.method || p.reference || 'Payment'}</div>
                                <div className="text-xs text-slate-500">{new Date(p.ts || p.created_at).toLocaleString()}</div>
                                {p.approved_by && (
                                  <div className="text-xs text-slate-500">Approved by: {p.approved_by}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-medium">₱{(p.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                <Badge className={`text-xs ${
                                  p.status === 'Completed' || p.status === 'Approved' || p.approved_at
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {p.status === 'Completed' ? 'Verified' : p.status || 'Pending'}
                                </Badge>
                              </div>
                            </div>
                            {(p.receipt_path || true) && (
                              <div className="mt-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-blue-600 hover:bg-blue-50 border-blue-200 text-xs"
                                  onClick={() => handleDownloadReceipt(p)}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  {p.status === 'Completed' || p.status === 'Approved' || p.approved_at ? 'Download Receipt' : 'Download Confirmation'}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button variant="outline" onClick={() => setPaymentsOpen(false)}>Close</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Installment Payment Modal */}
            <Dialog open={installmentPaymentOpen} onOpenChange={(open) => {
              setInstallmentPaymentOpen(open);
              if (!open) {
                setPenaltyPaymentAmount(null);
                setSelectedInstallmentPeriod(null);
              }
            }}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{penaltyPaymentAmount ? 'Pay Late Penalty Fee' : 'Pay Installment'}</DialogTitle>
                  <DialogDescription>
                    {penaltyPaymentAmount 
                      ? `Submit your late penalty fee payment for the ${selectedInstallmentPeriod} period`
                      : `Submit your payment for the ${selectedInstallmentPeriod} period`}
                  </DialogDescription>
                </DialogHeader>
                {currentEnrollment && (
                  <PaymentForm
                    enrollment={currentEnrollment}
                    onViewAssessment={() => openAssessmentModal(currentEnrollment.id)}
                    loadingAssessment={loadingAssessment}
                    onSubmit={async () => {
                      // Refresh both student data and installment schedule
                      await fetchStudentData();
                      // Force refresh of installment schedule
                      const resp = await studentService.getInstallmentSchedule(currentEnrollment.id);
                      const payments = resp?.data || [];
                      const downPayment = payments.find((p: any) => p.period === 'Down Payment');
                      
                      if (downPayment && currentEnrollment?.total_amount) {
                        const totalAmount = currentEnrollment.total_amount;
                        const monthlyAmount = totalAmount / 4;
                        const remainingPeriodNames = ['Prelim Period', 'Midterm Period', 'Finals Period'];
                        
                        const remainingPeriods = remainingPeriodNames.map(periodName => {
                          const existingPayment = payments.find((p: any) => p.period === periodName);
                          
                          if (existingPayment) {
                            return {
                              period: periodName,
                              amount: existingPayment.amount,
                              penalty_amount: existingPayment.penalty_amount || 0,
                              status: existingPayment.status,
                              id: existingPayment.id
                            };
                          } else {
                            return {
                              period: periodName,
                              amount: monthlyAmount,
                              penalty_amount: 0,
                              status: 'Not Started',
                              id: null
                            };
                          }
                        });
                        
                        setInstallmentSchedule(remainingPeriods);
                      }
                      
                      setInstallmentPaymentOpen(false);
                      setSelectedInstallmentPeriod(null);
                      setPenaltyPaymentAmount(null);
                    }}
                    loading={loading}
                    installmentPeriod={selectedInstallmentPeriod || undefined}
                    overrideAmount={penaltyPaymentAmount || undefined}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Assessment Modal */}
            <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Assessment Breakdown</DialogTitle>
                  <DialogDescription>Review assessment fees and subject fees for this enrollment.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {/* Student Details Header - Like COR */}
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Student Name</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {studentProfile && `${studentProfile.first_name || ''} ${studentProfile.middle_name || ''} ${studentProfile.last_name || ''}`.trim()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Student ID</p>
                        <p className="text-sm font-semibold text-slate-900">{studentProfile?.student_id || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Course</p>
                        <p className="text-sm font-semibold text-slate-900">{currentEnrollment?.course_name || studentProfile?.course || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Year Level</p>
                        <p className="text-sm font-semibold text-slate-900">{studentProfile?.year_level ? `${studentProfile.year_level}${studentProfile.year_level === 1 ? 'st' : studentProfile.year_level === 2 ? 'nd' : studentProfile.year_level === 3 ? 'rd' : 'th'} Year` : 'N/A'}</p>
                      </div>
                      {studentProfile?.section && (
                        <div>
                          <p className="text-xs text-slate-500 font-semibold uppercase">Section</p>
                          <p className="text-sm font-semibold text-slate-900">{studentProfile.section}</p>
                        </div>
                      )}
                      {studentProfile?.student_classification && (
                        <div>
                          <p className="text-xs text-slate-500 font-semibold uppercase">Classification</p>
                          <Badge className={studentProfile.student_classification === 'Irregular' ? 'bg-amber-100 text-amber-700 border-0' : 'bg-blue-100 text-blue-700 border-0'}>
                            {studentProfile.student_classification}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Scholarship Info */}
                  {enrollmentDetails?.scholarship_type && enrollmentDetails.scholarship_type !== 'None' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-blue-800 mb-1">Scholarship Applied</h4>
                      <div className="grid grid-cols-2 gap-1 text-sm text-blue-900">
                        <div className="text-blue-700">Type</div>
                        <div className="font-medium">{enrollmentDetails.scholarship_type}</div>
                        {enrollmentDetails.scholarship_coverage && (
                          <>
                            <div className="text-blue-700">Coverage</div>
                            <div className="font-medium">{enrollmentDetails.scholarship_coverage} of tuition</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium">Assessment Fees</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                      <div>Tuition {enrollmentDetails?.scholarship_coverage && enrollmentDetails?.scholarship_type !== 'None' ? <span className="text-blue-600 text-xs">(after {enrollmentDetails.scholarship_coverage} discount)</span> : ''}</div>
                      <div className="text-right">₱{(enrollmentDetails?.tuition || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      <div>Registration</div>
                      <div className="text-right">₱{(enrollmentDetails?.registration || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      <div>Library</div>
                      <div className="text-right">₱{(enrollmentDetails?.library || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      <div>Laboratory</div>
                      <div className="text-right">₱{(enrollmentDetails?.lab || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      <div>ID Fee</div>
                      <div className="text-right">₱{(enrollmentDetails?.id_fee || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      <div>Others</div>
                      <div className="text-right">₱{(enrollmentDetails?.others || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium">Subject Fees</h4>
                    <div className="text-sm mt-2">
                      <div className="flex justify-between"><div>Total Units</div><div>{enrollmentDetails?.total_units || 0}</div></div>
                      <div className="flex justify-between"><div>Rate per Unit</div><div>₱{feePerUnit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
                      <div className="flex justify-between font-medium mt-2"><div>Subject Fees</div><div>₱{((enrollmentDetails?.total_units || 0) * feePerUnit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>

                      <div className="mt-3">
                        <h5 className="text-sm font-medium">Subjects</h5>
                        <div className="mt-2 space-y-2">
                          {currentCourses.map((s: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <div>{s.code} — {s.name}</div>
                              <div>{s.units} unit{s.units !== 1 ? 's' : ''} • ₱{(s.units * feePerUnit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-1">
                    {(() => {
                      const covStr = enrollmentDetails?.scholarship_coverage || '';
                      const covPct = parseFloat(covStr) / 100 || 0;
                      const baseTuition = covPct > 0 && enrollmentDetails?.tuition != null
                        ? enrollmentDetails.tuition / (1 - covPct)
                        : enrollmentDetails?.tuition || 0;
                      const deduction = covPct > 0 ? baseTuition - (enrollmentDetails?.tuition || 0) : 0;
                      return (
                        <>
                          {deduction > 0 && (
                            <>
                              <div className="flex justify-between text-sm text-slate-600">
                                <div>Subtotal (before scholarship)</div>
                                <div>₱{(enrollmentDetails?.total_amount + deduction).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                              </div>
                              <div className="flex justify-between text-sm text-green-700 font-medium">
                                <div>Scholarship Deduction ({enrollmentDetails.scholarship_coverage} of tuition)</div>
                                <div>−₱{deduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between font-semibold text-base pt-1 border-t">
                            <div>Total Amount Due</div>
                            <div>₱{(enrollmentDetails?.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button variant="outline" onClick={() => setAssessmentOpen(false)}>Close</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
