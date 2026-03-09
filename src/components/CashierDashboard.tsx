import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { cashierService } from '../services/cashier.service';
import { 
  Loader2, 
  LogOut, 
  LayoutDashboard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Download,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Edit,
  Save
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Label } from './ui/label';
import React from 'react';

const PesoIcon = (props: any) => (
  <span {...props} className={(props.className || '') + ' inline-flex items-center'}>₱</span>
);
import api from '../utils/api';

interface CashierDashboardProps {
  onLogout: () => void;
}

export default function CashierDashboard({ onLogout }: CashierDashboardProps) {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ pending: 0, completed: 0, rejected: 0, totalAmount: 0 });
  const [analytics, setAnalytics] = useState({ totalCollections: 0, outstandingBalances: 0, pendingCount: 0 });
  const [filters, setFilters] = useState({ status: 'Pending', search: '', school_year: '', semester: '' });
  const [expandedTx, setExpandedTx] = useState<number | null>(null);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [installmentPayments, setInstallmentPayments] = useState<any[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [penaltyPaymentId, setPenaltyPaymentId] = useState<number | null>(null);
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [penaltyReason, setPenaltyReason] = useState('');
  const [enrollmentReviews, setEnrollmentReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [editingEnrollmentId, setEditingEnrollmentId] = useState<number | null>(null);
  const [feeForm, setFeeForm] = useState({ tuition: 0, registration: 0, library: 0, lab: 0, id_fee: 0, others: 0, remarks: '' });
  const [rejectEnrollmentId, setRejectEnrollmentId] = useState<number | null>(null);
  const [rejectEnrollmentReason, setRejectEnrollmentReason] = useState('');
  const [loadingFees, setLoadingFees] = useState(false);
  const [allCourseFees, setAllCourseFees] = useState<any[]>([]);
  const [selectedCourseForEdit, setSelectedCourseForEdit] = useState<string | null>(null);
  const [editingFees, setEditingFees] = useState(false);
  const [feeError, setFeeError] = useState('');
  const [currentFeeData, setCurrentFeeData] = useState({ course: '', tuition_per_unit: 700, registration: 1500, library: 500, lab: 2000, id_fee: 200, others: 300 });
  const [penaltyFeeConfig, setPenaltyFeeConfig] = useState<number>(500);
  const [editingPenaltyFee, setEditingPenaltyFee] = useState(false);
  const [penaltyFeeInput, setPenaltyFeeInput] = useState('500');

  const loadFees = async () => {
    try {
      setLoadingFees(true);
      setFeeError('');
      const result = await cashierService.getFees();
      const fees = Array.isArray(result) ? result : (result?.data || []);
      if (fees.length > 0) {
        setAllCourseFees(fees);
        // Always select first course if none selected, or re-select current
        const targetCourse = selectedCourseForEdit || fees[0].course;
        const found = fees.find((f: any) => f.course === targetCourse) || fees[0];
        setSelectedCourseForEdit(found.course);
        setCurrentFeeData(found);
      } else {
        setFeeError('No course fees found. Please run database setup first.');
      }
      // Load penalty fee config
      try {
        const penaltyResp = await cashierService.getPenaltyFeeConfig();
        const pf = penaltyResp?.data?.penalty_fee ?? 500;
        setPenaltyFeeConfig(pf);
        setPenaltyFeeInput(pf.toString());
      } catch (e) {
        console.error('Failed to load penalty fee config', e);
      }
    } catch (err: any) {
      console.error('Failed loading fees', err);
      setFeeError(err.message || 'Failed to load fee data from server');
    } finally {
      setLoadingFees(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      const resp = await cashierService.listTransactions(filters);
      const txList = resp?.data || resp || [];
      setTransactions(txList);
      setAllTransactions(txList);

      // Calculate stats from full list
      const pending = txList.filter((t: any) => t.status === 'Pending').length;
      const completed = txList.filter((t: any) => t.status === 'Completed').length;
      const rejected = txList.filter((t: any) => t.status === 'Rejected').length;
      const totalAmount = txList.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      setStats({ pending, completed, rejected, totalAmount });

      // Pull aggregated analytics
      const snap = await cashierService.getAnalyticsSnapshot();
      const data = snap?.data || snap || {};
      setAnalytics({
        totalCollections: data.totalCollections || 0,
        outstandingBalances: data.outstandingBalances || 0,
        pendingCount: data.pendingCount || pending
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTransactions(); }, [filters]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (activeSection !== 'Tuition Assessments') return;
      try {
        setLoadingAssessments(true);
        const resp = await cashierService.getTuitionAssessments();
        if (!mounted) return;
        setAssessments(resp?.data || resp || []);
      } catch (err) {
        console.error('Failed loading assessments', err);
      } finally {
        if (mounted) setLoadingAssessments(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [activeSection]);

  useEffect(() => {
    let mounted = true;
    const loadPending = async () => {
      if (activeSection !== 'Pending Verifications') return;
      try {
        setLoadingPending(true);
        const resp = await cashierService.listPending();
        if (!mounted) return;
        
        // Load installment payments separately
        const installmentResp = await cashierService.getInstallmentPayments({ status: 'Pending' });
        let installments = installmentResp?.data || installmentResp || [];
        
        // Deduplicate: if same enrollment_id and period exist, keep only the latest one by id
        const installmentMap = new Map<string, any>();
        installments.forEach((ip: any) => {
          const key = `${ip.enrollment_id}|${ip.period}`;
          const existing = installmentMap.get(key);
          // Keep the one with higher ID (more recent)
          if (!existing || ip.id > existing.id) {
            installmentMap.set(key, ip);
          }
        });
        installments = Array.from(installmentMap.values());
        
        // Create a set of (enrollmentId, period) tuples to identify installment payments
        const installmentSet = new Set(installments.map((ip: any) => `${ip.enrollment_id}|${ip.period}`));
        
        // Filter out installment payments from regular pending transactions
        // Installments have a 'period' field, so exclude those
        const regularPending = (resp?.data || resp || []).filter((pt: any) => {
          const key = `${pt.enrollment_id}|${pt.period}`;
          return !installmentSet.has(key) && !pt.period;
        });
        
        if (mounted) {
          setPendingTransactions(regularPending);
          setInstallmentPayments(installments);
        }
      } catch (err) {
        console.error('Failed loading pending transactions', err);
      } finally {
        if (mounted) setLoadingPending(false);
      }
    };
    loadPending();
    return () => { mounted = false; };
  }, [activeSection]);

  // Load enrollment reviews
  useEffect(() => {
    let mounted = true;
    const loadReviews = async () => {
      if (activeSection !== 'Enrollment Review') return;
      try {
        setLoadingReviews(true);
        const resp = await cashierService.getEnrollmentReviews();
        if (!mounted) return;
        setEnrollmentReviews(resp?.data || resp || []);
      } catch (err) {
        console.error('Failed loading enrollment reviews', err);
      } finally {
        if (mounted) setLoadingReviews(false);
      }
    };
    loadReviews();
    return () => { mounted = false; };
  }, [activeSection]);

  // Load predefined fees
  useEffect(() => {
    if (activeSection === 'Fee Management') {
      loadFees();
    }
  }, [activeSection]);

  const handleProcess = async (txId: number, action: 'complete' | 'reject') => {
    const actionLabel = action === 'complete' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this transaction?`)) return;
    try {
      setLoading(true);
      await cashierService.process(txId, action, action === 'reject' ? 'Rejected by cashier' : 'Processed by cashier');
      await loadTransactions();
    } catch (err: any) {
      setError(err.message || 'Failed to process transaction');
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const handleDownloadReceipt = async (receiptPath: string, filename: string) => {
    try {
      const response = await api.get(`/students/documents/download?path=${encodeURIComponent(receiptPath)}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'receipt');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download receipt');
    }
  };

  const viewTransactionDetails = (tx: any) => {
    setSelectedTx(tx);
    setDetailsOpen(true);
  };

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Enrollment Review', icon: ClipboardList },
    { name: 'Tuition Assessments', icon: FileText },
    { name: 'Pending Verifications', icon: Clock },
    { name: 'Fee Management', icon: Edit },
    { name: 'Transaction Logs', icon: FileText },
  ];

  const statCards = [
    { label: 'Total Collections', value: `₱${analytics.totalCollections.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: PesoIcon, color: 'from-green-500 to-green-600' },
    { label: 'Outstanding Balances', value: `₱${analytics.outstandingBalances.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: AlertCircle, color: 'from-orange-500 to-orange-600' },
    { label: 'Pending Transactions', value: (analytics.pendingCount || stats.pending).toString(), icon: Clock, color: 'from-amber-500 to-amber-600' },
    { label: 'Logged Transactions', value: allTransactions.length.toString(), icon: FileText, color: 'from-purple-500 to-purple-600' },
  ];

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    return (
      <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="p-6 border-0 shadow-lg hover:shadow-xl transition-all bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl mb-1">{stat.value}</h3>
                <p className="text-sm text-slate-600">{stat.label}</p>
              </Card>
            );
          })}
        </div>

        {/* Recent Transactions */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h3 className="text-white font-medium">Recent Pending Transactions</h3>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="p-4">
              {transactions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No pending transactions</p>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx, idx) => (
                    <div key={`recent-${tx.id}-${idx}`} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{tx.student_name || 'Unknown Student'}</p>
                          <p className="text-xs text-slate-500">
                            {tx.payment_method || 'N/A'} • Ref: {tx.reference_number || '—'}
                          </p>
                        </div>
                        <Badge className="bg-orange-100 text-orange-700 border-0">
                          {tx.status || 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold text-blue-600">
                          ₱{(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-400">{formatTimeAgo(tx.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </>
    );
  };

  const renderTransactionsContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    return (
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Transactions</h3>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Input
              placeholder="Search student or reference"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
            >
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
              <option value="">All</option>
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={filters.school_year}
              onChange={(e) => updateFilter('school_year', e.target.value)}
            >
              <option value="">All Years</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={filters.semester}
              onChange={(e) => updateFilter('semester', e.target.value)}
            >
              <option value="">All Semesters</option>
              <option value="1st">1st</option>
              <option value="2nd">2nd</option>
              <option value="Summer">Summer</option>
            </select>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No transactions found</p>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx, idx) => (
                <div key={`tx-${tx.id}-${idx}`} className="border rounded-lg overflow-hidden">
                  {/* Transaction Header */}
                  <div 
                    className="p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <PesoIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-slate-900">{tx.student_name || 'Unknown Student'}</h4>
                            <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                              {tx.status || 'Pending'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500">
                            {tx.course || 'N/A'} • Year {tx.year_level || 'N/A'}{tx.section ? ` • Section ${tx.section}` : ''} • {tx.school_year} {tx.semester} Sem
                          </p>
                          <p className="text-xs text-slate-600">
                            Outstanding: ₱{(tx.outstanding_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-blue-600">
                            ₱{(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-slate-400">{formatTimeAgo(tx.created_at)}</p>
                        </div>
                        {expandedTx === tx.id ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedTx === tx.id && (
                    <div className="p-4 border-t bg-white">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Payment Details */}
                        <div>
                          <h5 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Payment Details
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Student ID</span>
                              <span className="font-medium">{tx.student_id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Payment Method</span>
                              <span className="font-medium">{tx.payment_method || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Reference Number</span>
                              <span className="font-medium">{tx.reference_number || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Transaction Type</span>
                              <span className="font-medium">{tx.transaction_type || 'Enrollment Fee'}</span>
                            </div>
                          </div>
                          
                          {/* Proof of Payment */}
                          <div className="mt-4 pt-4 border-t">
                            <h6 className="text-sm font-medium text-slate-700 mb-2">Proof of Payment</h6>
                            {tx.receipt_path ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownloadReceipt(tx.receipt_path, tx.receipt_filename || 'receipt')}
                                className="w-full"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download Receipt
                              </Button>
                            ) : (
                              <p className="text-sm text-slate-400 italic">No receipt uploaded</p>
                            )}
                          </div>
                        </div>

                        {/* Assessment Breakdown */}
                        <div>
                          <h5 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                            <PesoIcon className="h-4 w-4" />
                            Assessment Breakdown
                          </h5>
                          <div className="space-y-2 text-sm bg-slate-50 rounded-lg p-3">
                            {tx.tuition > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Tuition Fee</span>
                                <span>₱{tx.tuition?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {tx.registration > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Registration Fee</span>
                                <span>₱{tx.registration?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {tx.library > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Library Fee</span>
                                <span>₱{tx.library?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {tx.lab > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Laboratory Fee</span>
                                <span>₱{tx.lab?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {tx.id_fee > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">ID Fee</span>
                                <span>₱{tx.id_fee?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {tx.others > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Other Fees</span>
                                <span>₱{tx.others?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                              <span>Total Amount</span>
                              <span className="text-blue-600">₱{tx.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                          {tx.enrollment_remarks && (
                            <p className="text-xs text-slate-500 mt-2">
                              <span className="font-medium">Remarks:</span> {tx.enrollment_remarks}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-4 pt-4 border-t justify-end">
                        <Button 
                          variant="outline"
                          onClick={() => viewTransactionDetails(tx)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Full Details
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleProcess(tx.id, 'reject')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Payment
                        </Button>
                        <Button 
                          onClick={() => handleProcess(tx.id, 'complete')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Payment
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderEnrollmentReviewContent = () => {
    if (loadingReviews) return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );

    const refreshReviews = async () => {
      try {
        setLoadingReviews(true);
        const resp = await cashierService.getEnrollmentReviews();
        setEnrollmentReviews(resp?.data || resp || []);
      } catch (err) {
        console.error('Failed refreshing enrollment reviews', err);
      } finally {
        setLoadingReviews(false);
      }
    };

    const openFeeEditor = (enrollment: any) => {
      setEditingEnrollmentId(enrollment.id);
      setFeeForm({
        tuition: enrollment.tuition || 0,
        registration: enrollment.registration || 0,
        library: enrollment.library || 0,
        lab: enrollment.lab || 0,
        id_fee: enrollment.id_fee || 0,
        others: enrollment.others || 0,
        remarks: enrollment.remarks || ''
      });
    };

    const handleSaveFees = async (enrollmentId: number) => {
      try {
        setLoadingReviews(true);
        await cashierService.updateEnrollmentFees(enrollmentId, {
          tuition: feeForm.tuition,
          registration: feeForm.registration,
          library: feeForm.library,
          lab: feeForm.lab,
          id_fee: feeForm.id_fee,
          others: feeForm.others
        });
        setEditingEnrollmentId(null);
        alert('Fees saved successfully.');
        await refreshReviews();
      } catch (err: any) {
        alert(err.message || 'Failed to save fees');
      } finally {
        setLoadingReviews(false);
      }
    };

    const handleApproveReview = async (enrollmentId: number) => {
      if (!window.confirm('Are you sure you want to approve and forward this enrollment to the Dean?')) return;
      try {
        setLoadingReviews(true);
        await cashierService.approveEnrollmentReview(enrollmentId);
        setEditingEnrollmentId(null);
        alert('Enrollment approved and forwarded to Dean.');
        await refreshReviews();
      } catch (err: any) {
        alert(err.message || 'Failed to approve enrollment');
      } finally {
        setLoadingReviews(false);
      }
    };

    const handleRejectReview = async (enrollmentId: number) => {
      if (!window.confirm('Are you sure you want to reject this enrollment?')) return;
      try {
        setLoadingReviews(true);
        await cashierService.rejectEnrollmentReview(enrollmentId, rejectEnrollmentReason);
        setRejectEnrollmentId(null);
        setRejectEnrollmentReason('');
        alert('Enrollment returned to registrar for re-assessment.');
        await refreshReviews();
      } catch (err: any) {
        alert(err.message || 'Failed to reject enrollment');
      } finally {
        setLoadingReviews(false);
      }
    };

    const feeTotal = feeForm.tuition + feeForm.registration + feeForm.library + feeForm.lab + feeForm.id_fee + feeForm.others;

    return (
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Enrollment Fee Review</h3>
              <p className="text-sm text-slate-500">Review and adjust fees set by the registrar before forwarding to the Dean.</p>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
              {enrollmentReviews.length} Pending
            </Badge>
          </div>

          {enrollmentReviews.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No enrollments pending cashier review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollmentReviews.map((enrollment: any) => {
                const isEditing = editingEnrollmentId === enrollment.id;
                const isRejecting = rejectEnrollmentId === enrollment.id;

                return (
                  <div key={enrollment.id} className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                    {/* Enrollment Header */}
                    <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{enrollment.student_name}</p>
                          <p className="text-sm text-slate-600">
                            {enrollment.student_id} • {enrollment.course} • Year {enrollment.year_level}{enrollment.section ? ` • Section ${enrollment.section}` : ''}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {enrollment.school_year} • {enrollment.semester} Semester • {enrollment.subject_count || 0} subjects
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">
                            ₱{(enrollment.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Cashier Review</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Fee Breakdown */}
                    <div className="p-4">
                      {isEditing ? (
                        /* Editable Fee Form */
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Edit className="h-4 w-4 text-blue-600" />
                            <h4 className="font-medium text-sm text-blue-700">Editing Fee Breakdown</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Tuition Fee</label>
                              <Input
                                type="number"
                                value={feeForm.tuition}
                                onChange={(e) => setFeeForm(f => ({ ...f, tuition: parseFloat(e.target.value) || 0 }))}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Registration Fee</label>
                              <Input
                                type="number"
                                value={feeForm.registration}
                                onChange={(e) => setFeeForm(f => ({ ...f, registration: parseFloat(e.target.value) || 0 }))}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Library Fee</label>
                              <Input
                                type="number"
                                value={feeForm.library}
                                onChange={(e) => setFeeForm(f => ({ ...f, library: parseFloat(e.target.value) || 0 }))}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Laboratory Fee</label>
                              <Input
                                type="number"
                                value={feeForm.lab}
                                onChange={(e) => setFeeForm(f => ({ ...f, lab: parseFloat(e.target.value) || 0 }))}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">ID Fee</label>
                              <Input
                                type="number"
                                value={feeForm.id_fee}
                                onChange={(e) => setFeeForm(f => ({ ...f, id_fee: parseFloat(e.target.value) || 0 }))}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Other Fees</label>
                              <Input
                                type="number"
                                value={feeForm.others}
                                onChange={(e) => setFeeForm(f => ({ ...f, others: parseFloat(e.target.value) || 0 }))}
                                className="text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Remarks (optional)</label>
                            <Input
                              value={feeForm.remarks}
                              onChange={(e) => setFeeForm(f => ({ ...f, remarks: e.target.value }))}
                              placeholder="Add cashier remarks..."
                              className="text-sm"
                            />
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <div className="text-sm">
                              <span className="text-slate-500">New Total: </span>
                              <span className="font-bold text-blue-600 text-lg">
                                ₱{feeTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingEnrollmentId(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => handleSaveFees(enrollment.id)}>
                                <Save className="h-3.5 w-3.5 mr-1" />
                                Save Fees
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : isRejecting ? (
                        /* Rejection Form */
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-red-700">Return to Registrar</h4>
                          <Input
                            value={rejectEnrollmentReason}
                            onChange={(e) => setRejectEnrollmentReason(e.target.value)}
                            placeholder="Reason for returning (e.g., incorrect fee computation)..."
                            className="text-sm"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => { setRejectEnrollmentId(null); setRejectEnrollmentReason(''); }}>
                              Cancel
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectReview(enrollment.id)}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Confirm Return
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Read-only Fee Display */
                        <div>
                          <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                            {enrollment.tuition > 0 && (
                              <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                                <span className="text-slate-500">Tuition</span>
                                <span className="font-medium">₱{enrollment.tuition?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {enrollment.registration > 0 && (
                              <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                                <span className="text-slate-500">Registration</span>
                                <span className="font-medium">₱{enrollment.registration?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {enrollment.library > 0 && (
                              <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                                <span className="text-slate-500">Library</span>
                                <span className="font-medium">₱{enrollment.library?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {enrollment.lab > 0 && (
                              <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                                <span className="text-slate-500">Laboratory</span>
                                <span className="font-medium">₱{enrollment.lab?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {enrollment.id_fee > 0 && (
                              <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                                <span className="text-slate-500">ID Fee</span>
                                <span className="font-medium">₱{enrollment.id_fee?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {enrollment.others > 0 && (
                              <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                                <span className="text-slate-500">Others</span>
                                <span className="font-medium">₱{enrollment.others?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </div>
                          {enrollment.remarks && (
                            <p className="text-xs text-slate-500 mb-3">
                              <span className="font-medium">Registrar Remarks:</span> {enrollment.remarks}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t">
                            {enrollment.scholarship_type && enrollment.scholarship_type !== 'None' && (
                              <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">
                                🎓 {enrollment.scholarship_type}
                              </Badge>
                            )}
                            <div className="flex gap-2 ml-auto">
                              <Button size="sm" variant="outline" onClick={() => openFeeEditor(enrollment)}>
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                Edit Fees
                              </Button>
                              <Button size="sm" variant="destructive" className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" onClick={() => setRejectEnrollmentId(enrollment.id)}>
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Return
                              </Button>
                              <Button size="sm" onClick={() => handleApproveReview(enrollment.id)}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Approve & Forward to Dean
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderTuitionAssessmentsContent = () => {
    if (loadingAssessments) return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );

    return (
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tuition Assessments</h3>
            <p className="text-sm text-slate-500">Review system-generated tuition assessments and approve.</p>
          </div>

          {assessments.length === 0 ? (
            <p className="text-sm text-slate-500">No assessments awaiting cashier review.</p>
          ) : (
            <div className="space-y-3">
              {assessments.map((a: any) => (
                <div key={a.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{a.student_name} • {a.student_id}</p>
                    <p className="text-xs text-slate-500">{a.course} • Year {a.year_level} • {a.school_year} {a.semester}</p>
                    <p className="text-sm text-slate-700">Total: ₱{(a.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={async () => {
                      if (!confirm('Approve this tuition assessment and mark Ready for Payment?')) return;
                      try {
                        await cashierService.approveAssessment(a.id);
                        alert('Assessment approved');
                        // refresh list
                        const resp = await cashierService.getTuitionAssessments();
                        setAssessments(resp?.data || resp || []);
                      } catch (err: any) {
                        alert(err.message || 'Failed to approve assessment');
                      }
                    }}>
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderPendingVerificationsContent = () => {
    if (loadingPending) return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );

    const refreshPending = async () => {
      try {
        setLoadingPending(true);
        const resp = await cashierService.listPending();
        
        // Load installment payments separately
        const installmentResp = await cashierService.getInstallmentPayments({ status: 'Pending' });
        let installments = installmentResp?.data || installmentResp || [];
        
        // Deduplicate: if same enrollment_id and period exist, keep only the latest one by id
        const installmentMap = new Map<string, any>();
        installments.forEach((ip: any) => {
          const key = `${ip.enrollment_id}|${ip.period}`;
          const existing = installmentMap.get(key);
          // Keep the one with higher ID (more recent)
          if (!existing || ip.id > existing.id) {
            installmentMap.set(key, ip);
          }
        });
        installments = Array.from(installmentMap.values());
        
        // Create a set of (enrollmentId, period) tuples to identify installment payments
        const installmentSet = new Set(installments.map((ip: any) => `${ip.enrollment_id}|${ip.period}`));
        
        // Filter out installment payments from regular pending transactions
        // Installments have a 'period' field, so exclude those
        const regularPending = (resp?.data || resp || []).filter((pt: any) => {
          const key = `${pt.enrollment_id}|${pt.period}`;
          return !installmentSet.has(key) && !pt.period;
        });
        
        setPendingTransactions(regularPending);
        setInstallmentPayments(installments);
      } catch (err) {
        console.error('Failed refreshing pending', err);
      } finally {
        setLoadingPending(false);
      }
    };

    const handleApproveInstallment = async (paymentId: number) => {
      if (!confirm('Approve this installment payment?')) return;
      try {
        await cashierService.approveInstallmentPayment(paymentId);
        alert('Installment payment approved');
        await refreshPending();
        await loadTransactions(); // Refresh analytics
      } catch (err: any) {
        alert(err.message || 'Failed to approve installment payment');
      }
    };

    const handleRejectInstallment = async (paymentId: number) => {
      if (!rejectReason.trim()) {
        alert('Please provide a rejection reason');
        return;
      }
      try {
        await cashierService.rejectInstallmentPayment(paymentId, rejectReason);
        alert('Installment payment rejected');
        setRejectingPaymentId(null);
        setRejectReason('');
        await refreshPending();
        await loadTransactions(); // Refresh analytics
      } catch (err: any) {
        alert(err.message || 'Failed to reject installment payment');
      }
    };

    const handleAddPenalty = async () => {
      const amount = parseFloat(penaltyAmount);
      if (!amount || amount <= 0) {
        alert('Please enter a valid penalty amount');
        return;
      }
      if (!penaltyPaymentId) return;
      try {
        await cashierService.addInstallmentPenalty(penaltyPaymentId, amount, penaltyReason || undefined);
        alert('Penalty added successfully');
        setPenaltyPaymentId(null);
        setPenaltyAmount('');
        setPenaltyReason('');
        await refreshPending();
      } catch (err: any) {
        alert(err.message || 'Failed to add penalty');
      }
    };

    return (
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Pending Verifications</h3>
            <p className="text-sm text-slate-500">Payments uploaded by students and awaiting cashier verification.</p>
          </div>

          {/* Installment Payments Section */}
          <div className="mb-8">
            <h4 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Installment Payments
            </h4>
            {installmentPayments.length === 0 ? (
              <p className="text-sm text-slate-500 ml-7">No pending installment payments.</p>
            ) : (
              <div className="space-y-3 ml-7">
                {installmentPayments.map((ip: any) => {
                  const totalTuition = ip.total_amount || 0;
                  const amountPaid = ip.amount_paid || 0;
                  const penaltyAmt = ip.penalty_amount || 0;

                  // Detect if this is a penalty fee payment (period ends with "- Late Penalty Fee")
                  const isPenaltyPayment = ip.period && ip.period.includes('- Late Penalty Fee');
                  const displayPeriod = isPenaltyPayment ? ip.period.replace(' - Late Penalty Fee', '') : ip.period;

                  // For penalty payments, show penalty amount as the total due and balance
                  const displayAmountDue = isPenaltyPayment ? penaltyAmt : totalTuition;
                  const balance = isPenaltyPayment
                    ? Math.max(penaltyAmt - amountPaid, 0)
                    : Math.max(totalTuition - amountPaid + penaltyAmt, 0);

                  // Determine due date and if payment is late
                  // Each period is 1 month from enrollment date
                  // Down Payment = enrollment date, Prelim = +1mo, Midterm = +2mo, Finals = +3mo
                  const enrollDate = new Date(ip.enrollment_date || ip.enrollment_created_at || ip.created_at);
                  const periodMonthOffset: Record<string, number> = {
                    'Down Payment': 0,
                    'Prelim Period': 1,
                    'Midterm Period': 2,
                    'Finals Period': 3,
                    'Prelim': 1,
                    'Midterm': 2,
                    'Finals': 3
                  };
                  const offset = periodMonthOffset[ip.period] ?? 1;
                  const dueDate = new Date(enrollDate);
                  dueDate.setMonth(dueDate.getMonth() + offset);
                  const now = new Date();
                  const isLate = now > dueDate && ip.status !== 'Approved';
                  const daysLate = isLate ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

                  return (
                    <div key={`${ip.enrollment_id}-${ip.period}-${ip.id}`} className={`border rounded-lg p-4 ${isLate ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-200'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{ip.student_name} • {ip.student_id}</p>
                            {isLate && (
                              <Badge className="bg-red-100 text-red-700 border-0 text-[10px] px-2">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {daysLate} day{daysLate !== 1 ? 's' : ''} overdue
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{ip.course} • Year {ip.year_level} • {ip.school_year} {ip.semester}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-slate-700">Period: <span className="font-semibold">{displayPeriod}</span>
                              {isPenaltyPayment && (
                                <Badge className="ml-2 bg-red-100 text-red-700 border-0 text-[10px] px-2">Penalty Fee Payment</Badge>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">Due Date: <span className={`font-medium ${isLate ? 'text-red-600' : 'text-slate-700'}`}>{dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span></p>
                            <p className="text-sm text-slate-700">{isPenaltyPayment ? 'Penalty Fee Due' : 'Total Amount Due'}: <span className="font-semibold">₱{displayAmountDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                            <p className="text-sm text-slate-700">Amount Paid: <span className="font-semibold text-green-700">₱{amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                            {!isPenaltyPayment && (
                              <p className={`text-sm font-medium ${penaltyAmt > 0 ? 'text-red-700' : 'text-slate-500'}`}>Penalty Fee: <span className="font-semibold">₱{penaltyAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                            )}
                            <p className="text-sm text-slate-700">{isPenaltyPayment ? 'Penalty Balance' : 'Outstanding Balance'}: <span className={`font-semibold ${balance > 0 ? 'text-orange-700' : 'text-green-700'}`}>₱{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                            <p className="text-xs text-slate-500">Payment Method: {ip.payment_method}</p>
                            {ip.reference_number && <p className="text-xs text-slate-500">Reference: {ip.reference_number}</p>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {rejectingPaymentId === ip.id ? (
                            <div className="w-48 space-y-2 border rounded-lg p-2 bg-white">
                              <textarea
                                placeholder="Enter rejection reason..."
                                className="w-full text-xs p-2 border rounded"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRejectInstallment(ip.id)}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRejectingPaymentId(null);
                                    setRejectReason('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                                <Button
                                size="sm"
                                onClick={() => handleApproveInstallment(ip.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setRejectingPaymentId(ip.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Regular Pending Transactions Section */}
          <div>
            <h4 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Regular Payments
            </h4>
            {pendingTransactions.length === 0 ? (
              <p className="text-sm text-slate-500 ml-7">No pending regular payments for verification.</p>
            ) : (
              <div className="space-y-3 ml-7">
                {pendingTransactions.map((pt: any, idx: number) => (
                  <div key={`pt-${pt.id}-${idx}`} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{pt.student_name} • {pt.student_id}</p>
                        <p className="text-xs text-slate-500">{pt.course} • Year {pt.year_level} • {pt.school_year} {pt.semester}</p>
                        <p className="text-sm text-slate-700 mt-2">Amount: ₱{(pt.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-slate-500">Outstanding: ₱{(pt.outstanding_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {pt.receipt_path ? (
                          <Button size="sm" variant="outline" onClick={() => handleDownloadReceipt(pt.receipt_path, pt.receipt_filename || 'receipt') }>
                            <Download className="h-4 w-4 mr-2" />
                            Download Receipt
                          </Button>
                        ) : (
                          <p className="text-xs italic text-slate-400">No receipt uploaded</p>
                        )}
                        <div className="flex gap-2">
                          <Button variant="destructive" size="sm" onClick={async () => {
                            if (!confirm('Reject this payment?')) return;
                            try {
                              await cashierService.process(pt.id, 'reject', 'Rejected by cashier');
                              alert('Payment rejected');
                              await refreshPending();
                              await loadTransactions();
                            } catch (err: any) {
                              alert(err.message || 'Failed to reject payment');
                            }
                          }}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button size="sm" onClick={async () => {
                            if (!confirm('Approve this payment?')) return;
                            try {
                              await cashierService.process(pt.id, 'complete', 'Approved by cashier');
                              alert('Payment approved');
                              await refreshPending();
                              await loadTransactions();
                            } catch (err: any) {
                              alert(err.message || 'Failed to approve payment');
                            }
                          }}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Penalty Dialog - kept for manual override if needed */}
        <Dialog open={penaltyPaymentId !== null} onOpenChange={(open) => { if (!open) { setPenaltyPaymentId(null); setPenaltyAmount(''); setPenaltyReason(''); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Add Manual Penalty
              </DialogTitle>
              <DialogDescription>
                Note: Penalties are now applied automatically when a student submits a payment past its due date (₱{penaltyFeeConfig.toLocaleString('en-US', { minimumFractionDigits: 2 })} per overdue period). Use this only if you need to add an additional penalty manually.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="penalty-amount" className="text-sm font-medium">Penalty Amount (₱)</Label>
                <Input
                  id="penalty-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter penalty amount"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="penalty-reason" className="text-sm font-medium">Reason (optional)</Label>
                <Input
                  id="penalty-reason"
                  placeholder="e.g. Late payment penalty"
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setPenaltyPaymentId(null); setPenaltyAmount(''); setPenaltyReason(''); }}>
                Cancel
              </Button>
              <Button className="!bg-amber-600 hover:!bg-amber-700 !text-white" onClick={handleAddPenalty}>
                Add Penalty
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  };

  const handleSavePenaltyFee = async () => {
    const val = parseFloat(penaltyFeeInput);
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid penalty fee amount');
      return;
    }
    try {
      await cashierService.updatePenaltyFeeConfig(val);
      setPenaltyFeeConfig(val);
      setEditingPenaltyFee(false);
      alert('Installment penalty fee updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update penalty fee');
    }
  };

  const renderFeeManagementContent = () => {
    if (loadingFees) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    if (feeError) {
      return (
        <Card className="border-0 shadow-lg">
          <div className="p-6 text-center">
            <p className="text-red-600 font-medium mb-4">{feeError}</p>
            <Button onClick={loadFees} variant="outline">
              Retry Loading Fees
            </Button>
          </div>
        </Card>
      );
    }

    if (allCourseFees.length === 0) {
      return (
        <Card className="border-0 shadow-lg">
          <div className="p-6 text-center">
            <p className="text-slate-600 mb-4">No course fees configured yet. Please run database setup.</p>
            <Button onClick={loadFees} variant="outline">
              Retry
            </Button>
          </div>
        </Card>
      );
    }

    const handleSaveFees = async () => {
      try {
        await cashierService.updateFees(currentFeeData);
        alert('Fee structure updated successfully');
        setEditingFees(false);
        await loadFees();
      } catch (err: any) {
        alert(err.message || 'Failed to update fees');
      }
    };

    const handleSelectCourse = (courseName: string) => {
      const course = allCourseFees.find(f => f.course === courseName);
      if (course) {
        setSelectedCourseForEdit(courseName);
        setCurrentFeeData(course);
        setEditingFees(false);
      }
    };

    return (
      <div className="space-y-6">
        {/* Course Selection */}
        <Card className="border-0 shadow-lg">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h3 className="text-white font-medium text-lg">Select Course to Edit Fees</h3>
            <p className="text-blue-100 text-sm">Choose a course to manage its fee structure</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {allCourseFees.map((fee) => (
                <Button
                  key={fee.course}
                  onClick={() => handleSelectCourse(fee.course)}
                  variant={selectedCourseForEdit === fee.course ? 'default' : 'outline'}
                  className={`flex flex-col items-start p-3 h-auto ${
                    selectedCourseForEdit === fee.course
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0'
                      : ''
                  }`}
                >
                  <span className="font-semibold text-sm">{fee.course}</span>
                  <span className="text-xs mt-1 opacity-80">₱{fee.tuition_per_unit}/unit</span>
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Fee Details */}
        <Card className="border-0 shadow-lg">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h3 className="text-white font-medium text-lg">Fee Structure for {selectedCourseForEdit || 'N/A'}</h3>
            <p className="text-blue-100 text-sm">Configure tuition per unit and other fees for this course</p>
          </div>
          
          <div className="p-6">
            {!editingFees ? (
              <>
                {/* Display Mode */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-slate-600 mb-2">Tuition Fee (Per Unit)</p>
                    <p className="text-3xl font-bold text-blue-600">₱{currentFeeData.tuition_per_unit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-slate-500 mt-2">Applied based on total enrolled units</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-600 mb-2">Registration Fee</p>
                    <p className="text-2xl font-bold text-blue-600">₱{currentFeeData.registration.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-600 mb-2">Library Fee</p>
                    <p className="text-2xl font-bold text-blue-600">₱{currentFeeData.library.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-600 mb-2">Laboratory Fee</p>
                    <p className="text-2xl font-bold text-blue-600">₱{currentFeeData.lab.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-600 mb-2">ID Fee</p>
                    <p className="text-2xl font-bold text-blue-600">₱{currentFeeData.id_fee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-600 mb-2">Other Fees</p>
                    <p className="text-2xl font-bold text-blue-600">₱{currentFeeData.others.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Example Calculation */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 mb-6 border border-amber-200">
                  <p className="text-sm font-medium text-slate-700 mb-3">Example Fee Calculation for {selectedCourseForEdit}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Student enrolls in 18 units</span>
                      <span className="font-semibold">18 units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tuition (₱{currentFeeData.tuition_per_unit}/unit × 18)</span>
                      <span className="font-semibold">₱{(currentFeeData.tuition_per_unit * 18).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-amber-200 pt-2 mt-2 flex justify-between">
                      <span className="text-slate-600">Fixed fees (Registration + Library + Lab + ID + Others)</span>
                      <span className="font-semibold">₱{(currentFeeData.registration + currentFeeData.library + currentFeeData.lab + currentFeeData.id_fee + currentFeeData.others).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-orange-700 border-t border-amber-300 pt-2 mt-2">
                      <span>Total (for 18 units)</span>
                      <span>₱{(currentFeeData.tuition_per_unit * 18 + currentFeeData.registration + currentFeeData.library + currentFeeData.lab + currentFeeData.id_fee + currentFeeData.others).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => setEditingFees(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Fee Structure
                </Button>
              </>
            ) : (
              <>
                {/* Edit Mode */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tuition Fee per Unit (₱)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentFeeData.tuition_per_unit}
                      onChange={(e) => setCurrentFeeData({ ...currentFeeData, tuition_per_unit: parseFloat(e.target.value) || 0 })}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">This amount will be multiplied by the number of units enrolled</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registration Fee (₱)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentFeeData.registration}
                      onChange={(e) => setCurrentFeeData({ ...currentFeeData, registration: parseFloat(e.target.value) || 0 })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Library Fee (₱)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentFeeData.library}
                      onChange={(e) => setCurrentFeeData({ ...currentFeeData, library: parseFloat(e.target.value) || 0 })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Laboratory Fee (₱)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentFeeData.lab}
                      onChange={(e) => setCurrentFeeData({ ...currentFeeData, lab: parseFloat(e.target.value) || 0 })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ID Fee (₱)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentFeeData.id_fee}
                      onChange={(e) => setCurrentFeeData({ ...currentFeeData, id_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Other Fees (₱)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentFeeData.others}
                      onChange={(e) => setCurrentFeeData({ ...currentFeeData, others: parseFloat(e.target.value) || 0 })}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Updated Example Calculation */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 mb-6 border border-amber-200">
                  <p className="text-sm font-medium text-slate-700 mb-3">Example with New Rates (18 units)</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tuition (₱{currentFeeData.tuition_per_unit}/unit × 18)</span>
                      <span className="font-semibold">₱{(currentFeeData.tuition_per_unit * 18).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-orange-700 border-t border-amber-300 pt-2 mt-2">
                      <span className="font-bold">Total Fixed Fees</span>
                      <span className="font-bold">₱{(currentFeeData.registration + currentFeeData.library + currentFeeData.lab + currentFeeData.id_fee + currentFeeData.others).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-orange-700 border-t border-amber-300 pt-2 mt-2">
                      <span>New Total</span>
                      <span>₱{(currentFeeData.tuition_per_unit * 18 + currentFeeData.registration + currentFeeData.library + currentFeeData.lab + currentFeeData.id_fee + currentFeeData.others).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    onClick={() => {
                      setEditingFees(false);
                      loadFees(); // Reload to discard changes
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveFees}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Installment Late Penalty Fee Configuration */}
        <Card className="border-0 shadow-lg">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <h3 className="text-white font-medium text-lg">Installment Late Penalty Fee</h3>
            <p className="text-amber-100 text-sm">This penalty fee is automatically applied when a student submits an installment payment past its due date</p>
          </div>
          
          <div className="p-6">
            {!editingPenaltyFee ? (
              <>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 mb-4">
                  <p className="text-sm text-slate-600 mb-2">Current Penalty Fee (per overdue period)</p>
                  <p className="text-3xl font-bold text-amber-600">₱{penaltyFeeConfig.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-slate-500 mt-2">Applied automatically when a student pays an installment period after its due date</p>
                </div>
                <Button 
                  onClick={() => { setEditingPenaltyFee(true); setPenaltyFeeInput(penaltyFeeConfig.toString()); }}
                  className="w-full !bg-gradient-to-r !from-amber-500 !to-orange-500 !text-white shadow-md"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Penalty Fee
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Penalty Fee Amount (₱)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={penaltyFeeInput}
                      onChange={(e) => setPenaltyFeeInput(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">This flat fee will be added to each overdue installment payment when the student submits it</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => { setEditingPenaltyFee(false); setPenaltyFeeInput(penaltyFeeConfig.toString()); }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSavePenaltyFee}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Penalty Fee
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
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
                <PesoIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-slate-900">IC Northgate</h3>
                <p className="text-sm text-slate-500">Cashier Portal</p>
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
              onClick={() => setActiveSection('Enrollment Review')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Enrollment Review' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="h-5 w-5" />
              Enrollment Review
            </button>

            <button
              onClick={() => setActiveSection('Tuition Assessments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Tuition Assessments' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText className="h-5 w-5" />
              Tuition Assessments
            </button>

            <button
              onClick={() => setActiveSection('Pending Verifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Pending Verifications' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Clock className="h-5 w-5" />
              Pending Verifications
            </button>

            <button
              onClick={() => setActiveSection('Fee Management')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Fee Management' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Edit className="h-5 w-5" />
              Fee Management
            </button>

            <button
              onClick={() => setActiveSection('Transaction Logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'Transaction Logs' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText className="h-5 w-5" />
              Transaction Logs
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
                  {activeSection === 'Dashboard' && 'Cashier Dashboard'}
                  {activeSection === 'Enrollment Review' && 'Enrollment Review'}
                  {activeSection === 'Tuition Assessments' && 'Tuition Assessments'}
                  {activeSection === 'Pending Verifications' && 'Payment Verifications'}
                  {activeSection === 'Fee Management' && 'Fee Management'}
                  {activeSection === 'Transaction Logs' && 'Transaction Logs'}
                </h1>
                <p className="text-sm text-slate-600">
                  {activeSection === 'Dashboard' && 'Payment processing and transaction management'}
                  {activeSection === 'Enrollment Review' && 'Review enrollments for fee verification'}
                  {activeSection === 'Tuition Assessments' && 'View and manage tuition assessments'}
                  {activeSection === 'Pending Verifications' && 'Verify and process pending student payments'}
                  {activeSection === 'Fee Management' && 'Configure and manage course fees'}
                  {activeSection === 'Transaction Logs' && 'View all financial transactions and history'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-slate-600">Cashier User</p>
                  <p className="text-xs text-slate-500">cashier@icnorthgate.edu</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                  <PesoIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Content */}
            {activeSection === 'Dashboard' && renderDashboardContent()}
            {activeSection === 'Enrollment Review' && renderEnrollmentReviewContent()}
            {activeSection === 'Tuition Assessments' && renderTuitionAssessmentsContent()}
            {activeSection === 'Pending Verifications' && renderPendingVerificationsContent()}
            {activeSection === 'Fee Management' && renderFeeManagementContent()}
            {activeSection === 'Transaction Logs' && renderTransactionsContent()}
          </div>
      </div>

      {/* Transaction Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Full details for payment verification
            </DialogDescription>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Student Information</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-slate-500">Name:</span> {selectedTx.student_name}</p>
                    <p><span className="text-slate-500">Student ID:</span> {selectedTx.student_id}</p>
                    <p><span className="text-slate-500">Course:</span> {selectedTx.course || 'N/A'}</p>
                    <p><span className="text-slate-500">Year Level:</span> {selectedTx.year_level || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Payment Information</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-slate-500">Method:</span> {selectedTx.payment_method}</p>
                    <p><span className="text-slate-500">Reference:</span> {selectedTx.reference_number || '—'}</p>
                    <p><span className="text-slate-500">Amount:</span> ₱{selectedTx.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <p><span className="text-slate-500">Date:</span> {new Date(selectedTx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Assessment Breakdown</h4>
                <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-2">
                  {selectedTx.tuition > 0 && (
                    <div className="flex justify-between">
                      <span>Tuition Fee</span>
                      <span>₱{selectedTx.tuition?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {selectedTx.registration > 0 && (
                    <div className="flex justify-between">
                      <span>Registration Fee</span>
                      <span>₱{selectedTx.registration?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {selectedTx.library > 0 && (
                    <div className="flex justify-between">
                      <span>Library Fee</span>
                      <span>₱{selectedTx.library?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {selectedTx.lab > 0 && (
                    <div className="flex justify-between">
                      <span>Laboratory Fee</span>
                      <span>₱{selectedTx.lab?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {selectedTx.id_fee > 0 && (
                    <div className="flex justify-between">
                      <span>ID Fee</span>
                      <span>₱{selectedTx.id_fee?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {selectedTx.others > 0 && (
                    <div className="flex justify-between">
                      <span>Other Fees</span>
                      <span>₱{selectedTx.others?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total</span>
                    <span className="text-blue-600">₱{selectedTx.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {selectedTx.receipt_path && (
                <div className="space-y-2">
                  <h4 className="font-medium">Proof of Payment</h4>
                  <Button 
                    variant="outline"
                    onClick={() => handleDownloadReceipt(selectedTx.receipt_path, selectedTx.receipt_filename || 'receipt')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Receipt
                  </Button>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t justify-end">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    handleProcess(selectedTx.id, 'reject');
                    setDetailsOpen(false);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  onClick={() => {
                    handleProcess(selectedTx.id, 'complete');
                    setDetailsOpen(false);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
