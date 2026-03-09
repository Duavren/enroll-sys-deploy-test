import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { 
  LogOut, 
  LayoutDashboard, 
  BookOpen,
  Users,
  GraduationCap,
  FileText,
  Calendar,
  Award,
  ChevronDown,
  Eye,
  Edit,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Download,
  CheckCircle,
  XCircle,
  ClipboardCheck
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
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
import { deanService } from '../services/dean.service';
import { facultyService } from '../services/faculty.service';
import { subjectService } from '../services/subject.service';
import CoursesManagement from './CoursesManagement';
import SubjectsManagement from './SubjectsManagement';
import { gradesService } from '../services/grades.service';
import analyticsService from '../services/analytics.service';

interface DeanDashboardProps {
  onLogout: () => void;
}

export default function DeanDashboard({ onLogout }: DeanDashboardProps) {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [academicOpen, setAcademicOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [facultyMembers, setFacultyMembers] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [gradesList, setGradesList] = useState<any[]>([]);
  const [pendingGrades, setPendingGrades] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('');

  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignFaculty, setReassignFaculty] = useState<any>(null);
  const [reassignSection, setReassignSection] = useState<string>('');
  const [gradesDialogOpen, setGradesDialogOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [addFacultyOpen, setAddFacultyOpen] = useState(false);
  const [editFacultyOpen, setEditFacultyOpen] = useState(false);
  const [deleteFacultyOpen, setDeleteFacultyOpen] = useState(false);
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  const [editProgramOpen, setEditProgramOpen] = useState(false);
  const [deleteProgramOpen, setDeleteProgramOpen] = useState(false);
  const [viewCurriculumOpen, setViewCurriculumOpen] = useState(false);
  const [addSubjectToCurriculumOpen, setAddSubjectToCurriculumOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [forDeanEnrollments, setForDeanEnrollments] = useState<any[]>([]);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<any>(null);
  const [approvalView, setApprovalView] = useState<'Enrollments' | 'Curriculum' | 'Grades'>('Enrollments');
  const [deanDetailOpen, setDeanDetailOpen] = useState(false);
  const [selectedDeanEnrollment, setSelectedDeanEnrollment] = useState<any>(null);
  const [deanDetails, setDeanDetails] = useState<any>(null);
  const [deanDocuments, setDeanDocuments] = useState<any[]>([]);
  const [deanRejectOpen, setDeanRejectOpen] = useState(false);
  const [deanRejectRemarks, setDeanRejectRemarks] = useState('');
  const [deanActionLoading, setDeanActionLoading] = useState(false);
  const [deanFeeForm, setDeanFeeForm] = useState({
    tuition: 0, registration: 0, library: 0, lab: 0, id_fee: 0, others: 0, remarks: '', scholarship_coverage: ''
  });

  const SCHOLARSHIP_DEFINITIONS: any = {
    'Merit Scholarship': { coverage: ['Highest Honors — 100%','High Honors — 50%'] },
    'Academic Scholarship': { coverage: ['GWA 1.25 — 100%','GWA 1.50 — 50%','GWA 1.75 — 20%'] },
    'Financial Assistance Scholarship': { coverage: ['50% scholarship'] },
    'Working Student Scholarship': { coverage: ['MI ≤ ₱17,500 — 50%','MI ₱20,000–22,499 — 40%','MI ₱22,500–25,000 — 30%'] },
    'Partnership Scholarships': { coverage: ['AFP/NBI/PNP — per MOU','LGU — 50%'] },
    'Promotional Scholarship Grants': { coverage: ['Depends on approved grant/campaign'] },
  };

  const getDeanTuitionDeduction = (coverage: string | undefined, baseTuition: number = 0) => {
    if (!coverage) return 0;
    if (coverage.includes('100%')) return baseTuition;
    if (coverage.includes('50%')) return baseTuition * 0.5;
    if (coverage.includes('40%')) return baseTuition * 0.4;
    if (coverage.includes('30%')) return baseTuition * 0.3;
    if (coverage.includes('25%')) return baseTuition * 0.25;
    if (coverage.includes('20%')) return baseTuition * 0.2;
    return 0;
  };

  const openDeanDetail = async (enr: any) => {
    setSelectedDeanEnrollment(enr);
    setDeanDetails(null);
    setDeanDocuments([]);
    setDeanDetailOpen(true);
    try {
      const [detailResp, docsResp] = await Promise.all([
        deanService.getEnrollmentDetails(enr.id),
        deanService.getEnrollmentDocuments(enr.id),
      ]);
      if (detailResp.success) {
        setDeanDetails(detailResp.data);
        const e = detailResp.data.enrollment;
        setDeanFeeForm({
          tuition: e.tuition || 0,
          registration: e.registration || 0,
          library: e.library || 0,
          lab: e.lab || 0,
          id_fee: e.id_fee || 0,
          others: e.others || 0,
          remarks: e.remarks || '',
          scholarship_coverage: e.scholarship_coverage || '',
        });
      }
      if (docsResp.success) setDeanDocuments(docsResp.data || []);
    } catch (err) {
      console.error('Failed to load enrollment details', err);
    }
  };

  const handleDeanApprove = async () => {
    if (!selectedDeanEnrollment) return;
    if (!window.confirm('Are you sure you want to approve this enrollment?')) return;
    try {
      setDeanActionLoading(true);
      await deanService.approveSubjectSelection(selectedDeanEnrollment.id, deanFeeForm);
      setDeanDetailOpen(false);
      await fetchForDeanEnrollments();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve enrollment');
    } finally {
      setDeanActionLoading(false);
    }
  };

  const handleDeanReject = async () => {
    if (!selectedDeanEnrollment) return;
    try {
      setDeanActionLoading(true);
      await deanService.rejectEnrollment(selectedDeanEnrollment.id, deanRejectRemarks);
      setDeanRejectOpen(false);
      setDeanDetailOpen(false);
      setDeanRejectRemarks('');
      await fetchForDeanEnrollments();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject enrollment');
    } finally {
      setDeanActionLoading(false);
    }
  };

  const handleDeanDownloadDocument = (docId: number) => {
    const token = localStorage.getItem('auth_token');
    const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000';
    window.open(`${baseUrl}/api/admin/documents/${docId}/download?token=${token}`, '_blank');
  };

  const [newFacultyForm, setNewFacultyForm] = useState({
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

  const [editFacultyForm, setEditFacultyForm] = useState({
    faculty_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    department: '',
    specialization: '',
    email: '',
    contact_number: '',
    status: 'Active',
    assign_department: '',
    assign_subject: ''
  });

  const [newProgramForm, setNewProgramForm] = useState({
    program_code: '',
    program_name: '',
    description: '',
    department: '',
    degree_type: 'Bachelor',
    duration_years: 4,
    total_units: 0
  });

  const [curriculumForm, setCurriculumForm] = useState({
    program_id: 0,
    subject_id: 0,
    year_level: 1,
    semester: '1st',
    is_core: true,
    prerequisite_subject_id: 0
  });

  useEffect(() => {
    fetchData();
  }, [activeSection]);

  useEffect(() => {
    loadSubjects();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      if (activeSection === 'Dashboard') {
        const statsResponse = await deanService.getDashboardStats();
        if (statsResponse.success) {
          setDashboardStats(statsResponse.data);
        }
        const deanAnalytics = await analyticsService.fetchDeanSummary();
        if (deanAnalytics.success) {
          setAnalyticsSummary(deanAnalytics.data);
        }
        // Fetch recent faculty for dashboard
        const facultyResponse = await facultyService.getAllFaculty({ status: 'Active' });
        if (facultyResponse.success) {
          setFacultyMembers(facultyResponse.data?.slice(0, 5) || []);
        }
      } else if (activeSection === 'Teacher Management') {
        const facultyResponse = await facultyService.getAllFaculty();
        if (facultyResponse.success) {
          setFacultyMembers(facultyResponse.data || []);
        }
      } else if (activeSection === 'Program Management') {
        const programsResponse = await deanService.getAllPrograms();
        if (programsResponse.success) {
          setPrograms(programsResponse.data || []);
        }
      } else if (activeSection === 'Curriculum') {
        const programsResponse = await deanService.getAllPrograms({ status: 'Active' });
        if (programsResponse.success) {
          setPrograms(programsResponse.data || []);
        }
      } else if (activeSection === 'Approval Requests') {
        await fetchForDeanEnrollments();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFaculty = async () => {
    try {
      setError('');
      await facultyService.createFaculty(newFacultyForm);
      setAddFacultyOpen(false);
      setNewFacultyForm({
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
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create faculty');
    }
  };

  const handleUpdateFaculty = async () => {
    try {
      setError('');
      await facultyService.updateFaculty(selectedFaculty.id, editFacultyForm);
      setEditFacultyOpen(false);
      setSelectedFaculty(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update faculty');
    }
  };

  const handleDeleteFaculty = async () => {
    try {
      setError('');
      await facultyService.deleteFaculty(selectedFaculty.id);
      setDeleteFacultyOpen(false);
      setSelectedFaculty(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete faculty');
    }
  };

  const handleCreateProgram = async () => {
    try {
      setError('');
      await deanService.createProgram(newProgramForm);
      setAddProgramOpen(false);
      setNewProgramForm({
        program_code: '',
        program_name: '',
        description: '',
        department: '',
        degree_type: 'Bachelor',
        duration_years: 4,
        total_units: 0
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create program');
    }
  };

  const handleViewCurriculum = async (programId: number) => {
    try {
      setError('');
      const response = await deanService.getCurriculumByProgram(programId);
      if (response.success) {
        setCurriculum(response.data || []);
        const program = programs.find(p => p.id === programId);
        setSelectedProgram(program);
        setViewCurriculumOpen(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load curriculum');
    }
  };

  const handleAddSubjectToCurriculum = async () => {
    try {
      setError('');
      await deanService.addSubjectToCurriculum(curriculumForm);
      setAddSubjectToCurriculumOpen(false);
      if (selectedProgram) {
        await handleViewCurriculum(selectedProgram.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add subject to curriculum');
    }
  };

  const handleRemoveSubjectFromCurriculum = async (curriculumId: number) => {
    try {
      setError('');
      await deanService.removeSubjectFromCurriculum(curriculumId);
      if (selectedProgram) {
        await handleViewCurriculum(selectedProgram.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove subject from curriculum');
    }
  };

  const handleDeleteProgram = async () => {
    if (!selectedProgram) return;
    try {
      setError('');
      await deanService.deleteProgram(selectedProgram.id);
      setDeleteProgramOpen(false);
      setViewCurriculumOpen(false);
      setSelectedProgram(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete program');
    }
  };

  const fetchForDeanEnrollments = async () => {
    try {
      setError('');
      const response = await deanService.getEnrollments({ status: 'For Dean Approval' });
      if (response.success) {
        setForDeanEnrollments(response.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load enrollments for dean');
    }
  };

  const handleApproveSubjects = async (enrollmentId: number) => {
    if (!window.confirm('Are you sure you want to approve these subjects?')) return;
    try {
      setApprovingId(enrollmentId);
      await deanService.approveSubjectSelection(enrollmentId);
      setApprovingId(null);
      await fetchForDeanEnrollments();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve subjects');
      setApprovingId(null);
    }
  };

  const loadGrades = async () => {
    try {
      setLoading(true);
      const resp = await gradesService.getGradesBySection({ sectionId: selectedSection || undefined, subjectId: selectedSubjectFilter || undefined });
      if (resp?.data) setGradesList(resp.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingGrades = async () => {
    try {
      setLoading(true);
      const resp = await gradesService.getPendingGrades();
      if (resp?.data) setPendingGrades(resp.data);
    } catch (err: any) {
      console.error('Failed to load pending grades:', err);
      setPendingGrades([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveGrade = async (enrollmentSubjectId: number) => {
    if (!window.confirm('Are you sure you want to approve this grade?')) return;
    try {
      setLoading(true);
      await gradesService.approveGrade(enrollmentSubjectId);
      await loadPendingGrades();
    } catch (err: any) {
      setError(err.message || 'Failed to approve grade');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReassign = (faculty: any) => {
    setReassignFaculty(faculty);
    setReassignSection(faculty.assigned_section || 'none');
    setReassignOpen(true);
  };

  const handleAssignSection = async () => {
    if (!reassignFaculty) return;
    try {
      await deanService.assignTeacherToSection(reassignFaculty.id, reassignSection);
      setFacultyMembers(prev => prev.map(f =>
        f.id === reassignFaculty.id
          ? { ...f, assigned_section: reassignSection === 'none' ? null : reassignSection }
          : f
      ));
      setReassignOpen(false);
      setReassignFaculty(null);
    } catch (err: any) {
      setError(err.message || 'Failed to assign teacher to section');
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await subjectService.getAllSubjects();
      if (response.success) {
        setSubjects(response.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load subjects:', err);
    }
  };

  const stats = dashboardStats ? [
    { 
      label: 'Total Teachers', 
      value: dashboardStats.totalFaculty?.toString() || '0', 
      icon: Users, 
      color: 'from-blue-500 to-blue-600',
      change: ''
    },
    { 
      label: 'Active Programs', 
      value: dashboardStats.activePrograms?.toString() || '0', 
      icon: BookOpen, 
      color: 'from-green-500 to-green-600',
      change: ''
    },
    { 
      label: 'Total Students', 
      value: dashboardStats.totalStudents?.toString() || '0', 
      icon: GraduationCap, 
      color: 'from-purple-500 to-purple-600',
      change: ''
    },
    { 
      label: 'Pending Approvals', 
      value: dashboardStats.pendingApprovals?.toString() || '0', 
      icon: FileText, 
      color: 'from-orange-500 to-orange-600',
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

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teacher Overview */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h3 className="text-white">Teachers</h3>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="p-4">
                {facultyMembers.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No faculty members found</p>
                ) : (
                  <div className="space-y-3">
                    {facultyMembers.map((faculty) => (
                      <div key={faculty.id} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm text-slate-900">{faculty.first_name} {faculty.last_name}</p>
                            <p className="text-xs text-slate-500">{faculty.faculty_id} • {faculty.department || 'N/A'}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                            {faculty.status}
                          </Badge>
                        </div>
                        {faculty.specialization && (
                          <p className="text-xs text-slate-600">{faculty.specialization}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Active Programs */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <h3 className="text-white">Active Programs</h3>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="p-4">
                {programs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No programs found</p>
                ) : (
                  <div className="space-y-3">
                    {programs.slice(0, 10).map((program) => (
                      <div key={program.id} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm text-slate-900">{program.program_code}</p>
                            <p className="text-xs text-slate-500">{program.program_name}</p>
                            <p className="text-xs text-slate-400 mt-1">{program.department || 'N/A'}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                            {program.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {analyticsSummary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card className="border-0 shadow-lg">
              <div className="p-6">
                <h4 className="text-slate-900 mb-2">Subject Demand (Top 10)</h4>
                <p className="text-sm text-slate-600 mb-4">Most enrolled subjects to help balance teaching loads.</p>
                <div className="space-y-2">
                  {(analyticsSummary.subjectDemand || []).map((row: any) => (
                    <div key={row.subject_code} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">{row.subject_code} - {row.subject_name}</p>
                      </div>
                      <Badge variant="secondary">{row.enrolled} enrolled</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="border-0 shadow-lg">
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="text-slate-900 mb-2">Students per Program</h4>
                  <div className="space-y-2">
                    {(analyticsSummary.perProgram || []).map((row: any) => (
                      <div key={row.course || row.program} className="flex justify-between text-sm p-2 border rounded">
                        <span>{row.course || row.program}</span>
                        <span className="font-semibold">{row.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-3">
                  <h4 className="text-slate-900 mb-2">Students per Year Level</h4>
                  <div className="space-y-2">
                    {(analyticsSummary.perYear || []).map((row: any) => (
                      <div key={row.yearLevel} className="flex justify-between text-sm p-2 border rounded">
                        <span>Year {row.yearLevel}</span>
                        <span className="font-semibold">{row.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </>
    );
  };

  const renderFacultyManagementContent = () => {
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
            <p className="text-slate-600 mb-6">Teacher roster pulled from Admin. Editing is limited to profile updates and reassignments.</p>
            {facultyMembers.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No faculty members found</p>
            ) : (
              <div className="space-y-4">
                {facultyMembers.map((faculty) => (
                  <div key={faculty.id} className="p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-slate-900">{faculty.first_name} {faculty.last_name}</h4>
                        <p className="text-sm text-slate-500">
                          {faculty.faculty_id} • {faculty.department || 'N/A'}
                          {faculty.assigned_section ? (
                            <Badge variant="secondary" className="ml-2">Section {faculty.assigned_section}</Badge>
                          ) : (
                            <Badge variant="outline" className="ml-2 text-slate-400">No Section</Badge>
                          )}
                        </p>
                        {faculty.specialization && (
                          <p className="text-sm text-slate-600 mt-1">{faculty.specialization}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleOpenReassign(faculty)}>
                          Reassign
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedFaculty(faculty);
                            setEditFacultyForm({
                              faculty_id: faculty.faculty_id,
                              first_name: faculty.first_name,
                              middle_name: faculty.middle_name || '',
                              last_name: faculty.last_name,
                              suffix: faculty.suffix || '',
                              department: faculty.department || '',
                              specialization: faculty.specialization || '',
                              email: faculty.email || '',
                              contact_number: faculty.contact_number || '',
                              status: faculty.status || 'Active',
                              assign_department: faculty.assign_department || '',
                              assign_subject: faculty.assign_subject || ''
                            });
                            setEditFacultyOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Add Faculty Dialog */}
        <Dialog open={addFacultyOpen} onOpenChange={setAddFacultyOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Faculty Member</DialogTitle>
              <DialogDescription>Create a new faculty member record.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Faculty ID</Label>
                  <Input
                    value={newFacultyForm.faculty_id}
                    onChange={(e) => setNewFacultyForm({ ...newFacultyForm, faculty_id: e.target.value })}
                    placeholder="F-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={newFacultyForm.department}
                    onChange={(e) => setNewFacultyForm({ ...newFacultyForm, department: e.target.value })}
                    placeholder="Computer Science"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={newFacultyForm.first_name}
                    onChange={(e) => setNewFacultyForm({ ...newFacultyForm, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Middle Name</Label>
                  <Input
                    value={newFacultyForm.middle_name}
                    onChange={(e) => setNewFacultyForm({ ...newFacultyForm, middle_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={newFacultyForm.last_name}
                    onChange={(e) => setNewFacultyForm({ ...newFacultyForm, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newFacultyForm.email}
                    onChange={(e) => setNewFacultyForm({ ...newFacultyForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input
                    value={newFacultyForm.contact_number}
                    onChange={(e) => setNewFacultyForm({ ...newFacultyForm, contact_number: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input
                  value={newFacultyForm.specialization}
                  onChange={(e) => setNewFacultyForm({ ...newFacultyForm, specialization: e.target.value })}
                  placeholder="e.g., Database Systems"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddFacultyOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateFaculty}>Create Faculty</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Faculty Dialog */}
        <Dialog open={editFacultyOpen} onOpenChange={setEditFacultyOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Faculty Member</DialogTitle>
              <DialogDescription>Update faculty member information.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Faculty ID</Label>
                <Input
                  value={editFacultyForm.faculty_id}
                  onChange={(e) => setEditFacultyForm({ ...editFacultyForm, faculty_id: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={editFacultyForm.first_name}
                    onChange={(e) => setEditFacultyForm({ ...editFacultyForm, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Middle Name</Label>
                  <Input
                    value={editFacultyForm.middle_name}
                    onChange={(e) => setEditFacultyForm({ ...editFacultyForm, middle_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={editFacultyForm.last_name}
                    onChange={(e) => setEditFacultyForm({ ...editFacultyForm, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editFacultyForm.email}
                    onChange={(e) => setEditFacultyForm({ ...editFacultyForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input
                    value={editFacultyForm.contact_number}
                    onChange={(e) => setEditFacultyForm({ ...editFacultyForm, contact_number: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editFacultyForm.status}
                  onValueChange={(value) => setEditFacultyForm({ ...editFacultyForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assign to Department</Label>
                  <Select
                    value={editFacultyForm.assign_department}
                    onValueChange={(value) => setEditFacultyForm({ ...editFacultyForm, assign_department: value, assign_subject: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BSCS">Computer Science Department (BSCS)</SelectItem>
                      <SelectItem value="BSIT">Information Technology Department (BSIT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign to Subject</Label>
                  <Select
                    value={editFacultyForm.assign_subject}
                    onValueChange={(value) => setEditFacultyForm({ ...editFacultyForm, assign_subject: value })}
                    disabled={!editFacultyForm.assign_department}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={editFacultyForm.assign_department ? "Select a subject" : "Select department first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.filter((subj: any) => subj.course === editFacultyForm.assign_department).map((subj: any) => (
                        <SelectItem key={subj.id} value={subj.id}>
                          {subj.subject_code} - {subj.subject_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditFacultyOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateFaculty}>Update Faculty</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Faculty Dialog */}
        <AlertDialog open={deleteFacultyOpen} onOpenChange={setDeleteFacultyOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete faculty member {selectedFaculty?.first_name} {selectedFaculty?.last_name}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteFaculty} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reassign Section Dialog */}
        <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Assign Section</DialogTitle>
              <DialogDescription>
                Assign <span className="font-semibold">{reassignFaculty?.first_name} {reassignFaculty?.last_name}</span> to a section.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Label>Section</Label>
              <Select value={reassignSection} onValueChange={setReassignSection}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not Assigned</SelectItem>
                  <SelectItem value="1">Section 1</SelectItem>
                  <SelectItem value="2">Section 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
              <Button onClick={handleAssignSection}>Assign</Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    );
  };

  const renderProgramManagementContent = () => {
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
        <div className="flex justify-end mb-6">
          <Button 
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
            onClick={() => setAddProgramOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Program
          </Button>
        </div>
        <Card className="border-0 shadow-lg">
          <div className="p-6">
            <p className="text-slate-600 mb-6">Manage academic programs and curricula.</p>
            {programs.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No programs found</p>
            ) : (
              <div className="space-y-4">
                {programs.map((program) => (
                  <div key={program.id} className="p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-slate-900">{program.program_code}</h4>
                          <Badge variant="secondary">{program.studentCount || 0} students</Badge>
                        </div>
                        <p className="text-sm text-slate-600">{program.program_name}</p>
                        {program.description && (
                          <p className="text-xs text-slate-500 mt-1">{program.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewCurriculum(program.id)}
                        >
                          View Curriculum
                        </Button>
                        <Button size="sm" variant="outline">Edit</Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{program.department || 'N/A'}</span>
                      {program.degree_type && <span>• {program.degree_type}</span>}
                      {program.duration_years && <span>• {program.duration_years} years</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Add Program Dialog */}

        {/* Grades Review Dialog */}
        <Dialog open={gradesDialogOpen} onOpenChange={setGradesDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Grades Review</DialogTitle>
              <DialogDescription>Load grades by section/subject and approve individual grades.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Section</Label>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Sections will be loaded via subjects for simplicity placeholder */}
                      <SelectItem value="">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {subjects.map(s => (<SelectItem key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={loadGrades}>Load Grades</Button>
                <Button variant="outline" onClick={() => { setSelectedSection(''); setSelectedSubjectFilter(''); setGradesList([]); }}>Reset</Button>
              </div>

              <div>
                {gradesList.length === 0 ? (
                  <p className="text-sm text-slate-500">No grades loaded</p>
                ) : (
                  <div className="space-y-2">
                    {gradesList.map((g: any) => (
                      <div key={g.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{g.student_name} — {g.subject_code}</div>
                          <div className="text-xs text-slate-500">Grade: {g.grade || 'N/A'}</div>
                        </div>
                        <div>
                          <Button size="sm" onClick={() => handleApproveGrade(g.id)}>Approve</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setGradesDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={addProgramOpen} onOpenChange={setAddProgramOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Program</DialogTitle>
              <DialogDescription>Create a new academic program.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Program Code</Label>
                  <Input
                    value={newProgramForm.program_code}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, program_code: e.target.value })}
                    placeholder="BSIT"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Degree Type</Label>
                  <Select
                    value={newProgramForm.degree_type}
                    onValueChange={(value) => setNewProgramForm({ ...newProgramForm, degree_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bachelor">Bachelor</SelectItem>
                      <SelectItem value="Associate">Associate</SelectItem>
                      <SelectItem value="Master">Master</SelectItem>
                      <SelectItem value="Doctorate">Doctorate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Program Name</Label>
                <Input
                  value={newProgramForm.program_name}
                  onChange={(e) => setNewProgramForm({ ...newProgramForm, program_name: e.target.value })}
                  placeholder="Bachelor of Science in Information Technology"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={newProgramForm.department}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (Years)</Label>
                  <Input
                    type="number"
                    value={newProgramForm.duration_years}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, duration_years: parseInt(e.target.value) || 4 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newProgramForm.description}
                  onChange={(e) => setNewProgramForm({ ...newProgramForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddProgramOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateProgram}>Create Program</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderDeanApprovalsContent = () => {
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

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Approval Requests</h3>
          <div className="flex items-center gap-2">
            <Button variant={approvalView === 'Enrollments' ? 'default' : 'outline'} onClick={() => { setApprovalView('Enrollments'); fetchForDeanEnrollments(); }}>Enrollments</Button>
            <Button variant={approvalView === 'Curriculum' ? 'default' : 'outline'} onClick={() => setApprovalView('Curriculum')}>Curriculum Updates</Button>
            <Button variant={approvalView === 'Grades' ? 'default' : 'outline'} onClick={() => { setApprovalView('Grades'); loadPendingGrades(); }}>Grades</Button>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <ScrollArea className="h-[500px]">
            <div className="p-4">
              {approvalView === 'Enrollments' && (
                (forDeanEnrollments.length === 0) ? (
                  <p className="text-center text-slate-500 py-8">No enrollments pending dean approval</p>
                ) : (
                  <div className="space-y-3">
                    {forDeanEnrollments.map((enr) => (
                      <div key={enr.id} className="p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900">{enr.first_name} {enr.last_name}</p>
                            <p className="text-sm text-slate-600">{enr.course || enr.program_name} • Year {enr.year_level}{enr.section ? ` • Section ${enr.section}` : ''} • {enr.semester} Sem</p>
                            <p className="text-xs text-slate-400 mt-1">{enr.school_year} — Submitted {new Date(enr.created_at).toLocaleDateString()}</p>
                            {enr.scholarship_type && enr.scholarship_type !== 'None' && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                🎓 {enr.scholarship_type}
                              </span>
                            )}
                          </div>
                          <Button size="sm" className=""
                            onClick={() => openDeanDetail(enr)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {approvalView === 'Curriculum' && (
                <div>
                  <p className="text-sm text-slate-600 mb-4">Curriculum updates awaiting approval will appear here.</p>
                  <p className="text-sm text-slate-500">(No pending curriculum updates in this demo.)</p>
                </div>
              )}

              {approvalView === 'Grades' && (
                <div>
                  <p className="text-sm text-slate-600 mb-4">Grades submitted by admin for your approval.</p>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : pendingGrades.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No grades pending approval.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Group grades by student */}
                      {Object.values(
                        pendingGrades.reduce((acc: Record<string, any>, g: any) => {
                          const key = g.student_name || 'Unknown';
                          if (!acc[key]) {
                            acc[key] = {
                              student_name: g.student_name,
                              course: g.course,
                              year_level: g.year_level,
                              school_year: g.school_year,
                              semester: g.semester,
                              grades: []
                            };
                          }
                          acc[key].grades.push(g);
                          return acc;
                        }, {} as Record<string, any>)
                      ).map((group: any) => (
                        <div key={group.student_name} className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                          {/* Student Header */}
                          <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50 border-b">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-slate-900">{group.student_name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{group.course} • Year {group.year_level} • {group.school_year} • {group.semester} Sem</p>
                              </div>
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                {group.grades.length} {group.grades.length === 1 ? 'subject' : 'subjects'}
                              </Badge>
                            </div>
                          </div>
                          {/* Subject Grades List */}
                          <div className="px-4 py-2 bg-slate-50 border-b flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <span>Subject</span>
                            <div className="flex items-center gap-3">
                              <span className="w-12 text-center">Grade</span>
                              <span className="w-24 text-center">Action</span>
                            </div>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {group.grades.map((g: any) => (
                              <div key={g.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800">{g.subject_code} — {g.subject_name}</p>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs text-slate-500">{g.units} units</span>
                                    <span className="text-xs text-slate-400">Submitted: {g.updated_at ? new Date(g.updated_at).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-sm font-bold text-indigo-600">{g.grade}</span>
                                  <Button size="sm" onClick={() => handleApproveGrade(g.id)}>
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Enrollment Detail Dialog */}
        <Dialog open={deanDetailOpen} onOpenChange={setDeanDetailOpen}>
          <DialogContent className="max-w-4xl sm:max-w-4xl flex flex-col" style={{maxHeight: '80vh'}}>
            <DialogHeader className="shrink-0">
              <DialogTitle>Enrollment Review</DialogTitle>
              {selectedDeanEnrollment && (
                <DialogDescription>
                  {selectedDeanEnrollment.first_name} {selectedDeanEnrollment.last_name} — {selectedDeanEnrollment.course} Year {selectedDeanEnrollment.year_level}{selectedDeanEnrollment.section ? ` • Section ${selectedDeanEnrollment.section}` : ''} • {selectedDeanEnrollment.semester} Sem {selectedDeanEnrollment.school_year}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="overflow-y-auto flex-1 pr-1">
            {!deanDetails ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
            ) : (
              <div className="grid grid-cols-5 gap-6 mt-2">
                {/* Left: Subjects + Documents */}
                <div className="col-span-2 space-y-4">
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-2 mb-2">
                      <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Assigned Subjects
                    </h4>
                    {(!deanDetails.subjects || deanDetails.subjects.length === 0) ? (
                      <p className="text-xs text-slate-500 italic">No subjects assigned.</p>
                    ) : (
                      <div className="space-y-2">
                        {deanDetails.subjects.map((s: any) => (
                          <div key={s.id} className="p-2.5 border rounded-lg bg-slate-50 text-xs">
                            <p className="font-bold">{s.subject_code}</p>
                            <p className="text-slate-500">{s.subject_name} • {s.units} units</p>
                          </div>
                        ))}
                        <p className="text-right text-xs font-semibold text-slate-500">
                          Total Units: {deanDetails.subjects.reduce((sum: number, s: any) => sum + (s.units || 0), 0)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Documents */}
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-600" /> Documents
                    </h4>
                    {deanDocuments.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No documents uploaded.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {deanDocuments.map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 border rounded-lg bg-white text-xs">
                            <span className="truncate flex-1 text-slate-700">{doc.document_type || doc.file_name}</span>
                            <button onClick={() => handleDeanDownloadDocument(doc.id)}
                              className="ml-2 shrink-0 text-blue-600 hover:text-blue-800">
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Assessment Breakdown (editable) */}
                <div className="col-span-3 space-y-4">
                  {selectedDeanEnrollment?.scholarship_type && selectedDeanEnrollment.scholarship_type !== 'None' && (
                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                      <p className="text-xs font-bold text-indigo-700 mb-2">🎓 {selectedDeanEnrollment.scholarship_type}</p>
                      <p className="text-[11px] text-slate-500 mb-2">Select coverage to apply deduction:</p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {(SCHOLARSHIP_DEFINITIONS[selectedDeanEnrollment.scholarship_type]?.coverage || []).map((c: string) => (
                          <button key={c} type="button"
                            onClick={() => setDeanFeeForm(f => ({ ...f, scholarship_coverage: c }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left border-2 transition-all ${
                              deanFeeForm.scholarship_coverage === c
                                ? 'bg-indigo-100 text-slate-900 border-indigo-500'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                            }`}>{c}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Tuition</Label>
                      <Input type="number" value={deanFeeForm.tuition} onChange={e => setDeanFeeForm(f => ({ ...f, tuition: Number(e.target.value) }))} />
                    </div>
                    <div><Label className="text-xs">Registration</Label>
                      <Input type="number" value={deanFeeForm.registration} onChange={e => setDeanFeeForm(f => ({ ...f, registration: Number(e.target.value) }))} />
                    </div>
                    <div><Label className="text-xs">Library</Label>
                      <Input type="number" value={deanFeeForm.library} onChange={e => setDeanFeeForm(f => ({ ...f, library: Number(e.target.value) }))} />
                    </div>
                    <div><Label className="text-xs">Lab</Label>
                      <Input type="number" value={deanFeeForm.lab} onChange={e => setDeanFeeForm(f => ({ ...f, lab: Number(e.target.value) }))} />
                    </div>
                    <div><Label className="text-xs">ID Fee</Label>
                      <Input type="number" value={deanFeeForm.id_fee} onChange={e => setDeanFeeForm(f => ({ ...f, id_fee: Number(e.target.value) }))} />
                    </div>
                    <div><Label className="text-xs">Others</Label>
                      <Input type="number" value={deanFeeForm.others} onChange={e => setDeanFeeForm(f => ({ ...f, others: Number(e.target.value) }))} />
                    </div>
                  </div>

                  <div><Label className="text-xs">Remarks</Label>
                    <Input value={deanFeeForm.remarks} onChange={e => setDeanFeeForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Notes..." />
                  </div>

                  {/* Breakdown summary */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-2">
                    {(() => {
                      const totalUnits = deanDetails.subjects?.reduce((sum: number, s: any) => sum + (s.units || 0), 0) || 0;
                      const perUnit = 700;
                      return totalUnits > 0 ? (
                        <div className="flex justify-between text-slate-600">
                          <span>Tuition ({totalUnits} units × ₱{perUnit.toLocaleString()}/unit):</span>
                          <span>₱{deanFeeForm.tuition.toLocaleString()}.00</span>
                        </div>
                      ) : null;
                    })()}
                    {deanFeeForm.scholarship_coverage && (
                      <div className="flex justify-between text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                        <span>Scholarship Deduction:</span>
                        <span>- ₱{getDeanTuitionDeduction(deanFeeForm.scholarship_coverage, deanFeeForm.tuition).toLocaleString()}.00</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>Misc Fees:</span>
                      <span>₱{(deanFeeForm.registration + deanFeeForm.library + deanFeeForm.lab + deanFeeForm.id_fee + deanFeeForm.others).toLocaleString()}.00</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between font-bold text-slate-900 pt-1">
                      <span>Total Assessment:</span>
                      <span className="text-xl text-indigo-600 font-mono">
                        ₱{(deanFeeForm.tuition - getDeanTuitionDeduction(deanFeeForm.scholarship_coverage, deanFeeForm.tuition) + deanFeeForm.registration + deanFeeForm.library + deanFeeForm.lab + deanFeeForm.id_fee + deanFeeForm.others).toLocaleString()}.00
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Action buttons — always visible at bottom */}
            <div className="shrink-0 flex gap-2 justify-end pt-3 border-t mt-2">
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setDeanRejectOpen(true)} disabled={deanActionLoading}>
                <XCircle className="h-4 w-4 mr-1" /> Decline
              </Button>
              <Button className=""
                onClick={handleDeanApprove} disabled={deanActionLoading}>
                {deanActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Approve & Forward to Student
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject Confirmation */}
        <AlertDialog open={deanRejectOpen} onOpenChange={setDeanRejectOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Return to Registrar?</AlertDialogTitle>
              <AlertDialogDescription>This will send the enrollment back to the registrar for re-assessment.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-2">
              <Label className="text-xs">Reason / Remarks</Label>
              <Input value={deanRejectRemarks} onChange={e => setDeanRejectRemarks(e.target.value)} placeholder="State reason for returning..." />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeanReject} disabled={deanActionLoading}>
                {deanActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Return to Registrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  const renderCurriculumContent = () => {
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
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-600">Manage curriculum for each program.</p>
              <Button onClick={() => setAddProgramOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Program
              </Button>
            </div>
            {programs.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No programs found. Create a program first.</p>
            ) : (
              <div className="space-y-4">
                {programs.map((program) => (
                  <div key={program.id} className="p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-slate-900">{program.program_code} - {program.program_name}</h4>
                        <p className="text-sm text-slate-500 mt-1">{program.department || 'N/A'}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewCurriculum(program.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View/Edit Curriculum
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Add Program Dialog */}
        <Dialog open={addProgramOpen} onOpenChange={setAddProgramOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Curriculum Program</DialogTitle>
              <DialogDescription>Create a new program to manage its curriculum.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Program Code</Label>
                  <Input
                    placeholder="e.g. BSIT"
                    value={newProgramForm.program_code}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, program_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Degree Type</Label>
                  <Select
                    value={newProgramForm.degree_type}
                    onValueChange={(value) => setNewProgramForm({ ...newProgramForm, degree_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bachelor">Bachelor</SelectItem>
                      <SelectItem value="Associate">Associate</SelectItem>
                      <SelectItem value="Master">Master</SelectItem>
                      <SelectItem value="Doctorate">Doctorate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Program Name</Label>
                <Input
                  placeholder="e.g. Bachelor of Science in Information Technology"
                  value={newProgramForm.program_name}
                  onChange={(e) => setNewProgramForm({ ...newProgramForm, program_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of the program"
                  value={newProgramForm.description}
                  onChange={(e) => setNewProgramForm({ ...newProgramForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  placeholder="e.g. College of Computer Studies"
                  value={newProgramForm.department}
                  onChange={(e) => setNewProgramForm({ ...newProgramForm, department: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (Years)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={newProgramForm.duration_years}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, duration_years: parseInt(e.target.value) || 4 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Units</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newProgramForm.total_units}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, total_units: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAddProgramOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateProgram}>Create Program</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Curriculum Dialog */}
        <Dialog open={viewCurriculumOpen} onOpenChange={setViewCurriculumOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Curriculum: {selectedProgram?.program_code}</DialogTitle>
              <DialogDescription>Manage subjects for this program.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {curriculum.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No subjects in curriculum yet.</p>
              ) : (
                <div className="space-y-2">
                  {curriculum.map((item) => (
                    <div key={item.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.subject_code} - {item.subject_name}</p>
                        <p className="text-xs text-slate-500">
                          Year {item.year_level} • {item.semester} Semester • {item.units} units
                          {item.is_core ? ' • Core' : ' • Elective'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveSubjectFromCurriculum(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={async () => {
                    await loadSubjects();
                    setCurriculumForm({ ...curriculumForm, program_id: selectedProgram?.id || 0 });
                    setAddSubjectToCurriculumOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
                <Button 
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => setDeleteProgramOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Program
                </Button>
                <Button variant="outline" onClick={() => setViewCurriculumOpen(false)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Subject to Curriculum Dialog */}
        <Dialog open={addSubjectToCurriculumOpen} onOpenChange={setAddSubjectToCurriculumOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Subject to Curriculum</DialogTitle>
              <DialogDescription>Add a subject to the program curriculum.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={curriculumForm.subject_id.toString()}
                  onValueChange={(value) => setCurriculumForm({ ...curriculumForm, subject_id: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.subject_code} - {subject.subject_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year Level</Label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={curriculumForm.year_level}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, year_level: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select
                    value={curriculumForm.semester}
                    onValueChange={(value) => setCurriculumForm({ ...curriculumForm, semester: value })}
                  >
                    <SelectTrigger>
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddSubjectToCurriculumOpen(false)}>Cancel</Button>
                <Button onClick={handleAddSubjectToCurriculum}>Add Subject</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Program Confirmation Dialog */}
        <AlertDialog open={deleteProgramOpen} onOpenChange={setDeleteProgramOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Program</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <span className="font-semibold">{selectedProgram?.program_code} - {selectedProgram?.program_name}</span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteProgram}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
                <p className="text-sm text-slate-500">Dean Portal</p>
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
              onClick={() => setActiveSection('Teacher Management')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Teacher Management' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="h-5 w-5" />
              Teacher Management
            </button>

            <button
              onClick={() => setActiveSection('Subjects')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Subjects' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              Subjects
            </button>

            <button
              onClick={() => setActiveSection('Curriculum')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Curriculum' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText className="h-5 w-5" />
              Curriculum
            </button>

            <button
              onClick={() => setActiveSection('Approval Requests')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Approval Requests' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Award className="h-5 w-5" />
              Approval Requests
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
                  {activeSection === 'Dashboard' && 'Dean Dashboard'}
                  {activeSection === 'Teacher Management' && 'Teacher Management'}
                  {activeSection === 'Subjects' && 'Subjects'}
                  {activeSection === 'Curriculum' && 'Curriculum'}
                  {activeSection === 'Approval Requests' && 'Approval Requests'}
                </h1>
                <p className="text-sm text-slate-600">
                  {activeSection === 'Dashboard' && 'Academic management and curriculum oversight'}
                  {activeSection === 'Teacher Management' && 'Manage faculty assignments and information'}
                  {activeSection === 'Subjects' && 'Manage academic subjects and curriculum'}
                  {activeSection === 'Curriculum' && 'Oversee academic programs and curriculum'}
                  {activeSection === 'Approval Requests' && 'Review and approve enrollments, curriculum changes, and grades'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-slate-600">Dean User</p>
                  <p className="text-xs text-slate-500">dean@icnorthgate.edu</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {/* Dynamic Content */}
            {activeSection === 'Dashboard' && renderDashboardContent()}
            {activeSection === 'Teacher Management' && renderFacultyManagementContent()}
            {activeSection === 'Subjects' && <SubjectsManagement />}
            {activeSection === 'Curriculum' && renderCurriculumContent()}
            {activeSection === 'Approval Requests' && renderDeanApprovalsContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
