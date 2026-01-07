"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Search, 
  Eye, 
  Download, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Briefcase,
  GraduationCap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

interface Application {
  id: string;
  jobId: string;
  jobSeekerId: string;
  recruiterId: string;
  resumeUrl?: string;
  coverLetter: string;
  expectedSalary?: string;
  noticePeriod?: string;
  availabilityDate?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  additionalNotes?: string;
  status: string;
  appliedDate: string;
  reviewedDate?: string;
  notes?: string;
  job: {
    title: string;
    company: string;
    location: string;
    employmentType: string;
  };
  jobSeeker: {
    fullName: string;
    email: string;
    phone?: string;
    currentJobTitle?: string;
    yearsOfExperience?: string;
    education?: string;
    skills: string[];
    city?: string;
    country?: string;
    resume?: string;
  };
}

export default function RecruiterApplicationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // "all", "today", "week", "month", "custom"
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [downloadingResume, setDownloadingResume] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any)?.role !== "recruiter") {
      router.replace("/auth/recruiter/login");
      return;
    }
    fetchApplications();
  }, [session, status, router]);

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/applications?recruiterId=${(session?.user as any).id}`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobSeeker.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobSeeker.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    
    // Date filter
    let matchesDate = true;
    if (dateFilter !== "all") {
      const appDate = new Date(app.appliedDate);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateFilter === "today") {
        matchesDate = appDate >= today;
      } else if (dateFilter === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = appDate >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = appDate >= monthAgo;
      } else if (dateFilter === "custom") {
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999); // Include the entire end date
          matchesDate = appDate >= start && appDate <= end;
        }
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Group applications by job
  const groupedApplications = filteredApplications.reduce((acc, app) => {
    if (!acc[app.jobId]) {
      acc[app.jobId] = {
        job: app.job,
        jobId: app.jobId,
        applications: []
      };
    }
    acc[app.jobId].applications.push(app);
    return acc;
  }, {} as Record<string, { job: Application['job'], jobId: string, applications: Application[] }>);

  const toggleJob = (jobId: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  // Expand all jobs by default on first load
  useEffect(() => {
    if (Object.keys(groupedApplications).length > 0 && expandedJobs.size === 0) {
      setExpandedJobs(new Set(Object.keys(groupedApplications)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredApplications.length]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Applied":
        return "bg-blue-100 text-blue-800";
      case "Under Review":
        return "bg-yellow-100 text-yellow-800";
      case "Shortlisted":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      case "Hired":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  const downloadResume = async (resumeUrl: string, candidateName: string) => {
    try {
      setDownloadingResume(candidateName);
      
      // Convert relative URL to absolute if needed
      const absoluteUrl = resumeUrl.startsWith('http') ? resumeUrl : `${window.location.origin}${resumeUrl}`;
      
      // Fetch the file first to verify it exists and can be accessed
      const response = await fetch(absoluteUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch resume: ${response.status} ${response.statusText}`);
      }
      
      // Create blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      
      // Extract file extension from URL or default to .pdf
      const fileExtension = resumeUrl.split('.').pop()?.toLowerCase() || 'pdf';
      const sanitizedName = candidateName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      link.download = `${sanitizedName}_resume.${fileExtension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Resume downloaded successfully for ${candidateName}`);
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast.error(`Failed to download resume: ${error instanceof Error ? error.message : 'File may not be available'}`);
    } finally {
      setDownloadingResume(null);
    }
  };

  const downloadJobCandidatesCSV = (jobApplications: Application[], jobTitle: string) => {
    try {
      if (jobApplications.length === 0) {
        toast.error('No candidates to download for this job');
        return;
      }

      // Create CSV headers with comprehensive candidate details
      const headers = [
        'Candidate Name',
        'Email',
        'Phone',
        'Current Job Title',
        'Years of Experience',
        'Education',
        'Location',
        'Skills',
        'Status',
        'Applied Date',
        'Expected Salary',
        'Notice Period',
        'Availability Date',
        'Cover Letter',
        'Portfolio URL',
        'LinkedIn URL',
        'GitHub URL'
      ];

      // Create CSV rows with all candidate details
      const rows = jobApplications.map(app => [
        app.jobSeeker.fullName || '',
        app.jobSeeker.email || '',
        app.jobSeeker.phone || '',
        app.jobSeeker.currentJobTitle || '',
        app.jobSeeker.yearsOfExperience || '',
        app.jobSeeker.education || '',
        [app.jobSeeker.city, app.jobSeeker.country].filter(Boolean).join(', ') || '',
        (app.jobSeeker.skills || []).join('; ') || '',
        app.status || '',
        formatDate(app.appliedDate),
        app.expectedSalary || '',
        app.noticePeriod || '',
        app.availabilityDate || '',
        (app.coverLetter || '').replace(/\n/g, ' ').substring(0, 200) || '', // Truncate long cover letters
        app.portfolioUrl || '',
        app.linkedinUrl || '',
        app.githubUrl || ''
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Generate filename with job title and date
      const dateStr = new Date().toISOString().split('T')[0];
      const sanitizedJobTitle = jobTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
      link.setAttribute('download', `candidates_${sanitizedJobTitle}_${dateStr}.csv`);
      link.setAttribute('href', url);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${jobApplications.length} candidate${jobApplications.length !== 1 ? 's' : ''} for ${jobTitle}`);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('Failed to download candidates list');
    }
  };

  const downloadApplicationsCSV = () => {
    try {
      if (filteredApplications.length === 0) {
        toast.error('No applications to download');
        return;
      }

      // Create CSV headers with comprehensive candidate details
      const headers = [
        'Candidate Name',
        'Email',
        'Phone',
        'Current Job Title',
        'Years of Experience',
        'Education',
        'Location',
        'Skills',
        'Job Title',
        'Company',
        'Job Location',
        'Employment Type',
        'Status',
        'Applied Date',
        'Expected Salary',
        'Notice Period',
        'Availability Date',
        'Cover Letter',
        'Portfolio URL',
        'LinkedIn URL',
        'GitHub URL'
      ];

      // Create CSV rows with all candidate details
      const rows = filteredApplications.map(app => [
        app.jobSeeker.fullName || '',
        app.jobSeeker.email || '',
        app.jobSeeker.phone || '',
        app.jobSeeker.currentJobTitle || '',
        app.jobSeeker.yearsOfExperience || '',
        app.jobSeeker.education || '',
        [app.jobSeeker.city, app.jobSeeker.country].filter(Boolean).join(', ') || '',
        (app.jobSeeker.skills || []).join('; ') || '',
        app.job.title || '',
        app.job.company || '',
        app.job.location || '',
        app.job.employmentType || '',
        app.status || '',
        formatDate(app.appliedDate),
        app.expectedSalary || '',
        app.noticePeriod || '',
        app.availabilityDate || '',
        (app.coverLetter || '').replace(/\n/g, ' ').substring(0, 200) || '', // Truncate long cover letters
        app.portfolioUrl || '',
        app.linkedinUrl || '',
        app.githubUrl || ''
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Generate filename with date and filter info
      const dateStr = new Date().toISOString().split('T')[0];
      const statusStr = statusFilter !== 'all' ? `_${statusFilter.replace(/\s+/g, '_')}` : '';
      const dateFilterStr = dateFilter !== 'all' ? `_${dateFilter}` : '';
      link.setAttribute('download', `candidates_list_${dateStr}${statusStr}${dateFilterStr}.csv`);
      link.setAttribute('href', url);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${filteredApplications.length} candidate${filteredApplications.length !== 1 ? 's' : ''} list`);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('Failed to download candidates list');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="h-20"></div>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="h-20"></div>
      
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/recruiter" 
              className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
              <div>
                <h1 className="text-3xl font-bold">Job Applications</h1>
                <p className="text-muted-foreground mt-2">
                  Manage applications for your job postings
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="text-2xl font-bold">{applications.length}</div>
              <div className="text-muted-foreground text-sm">Total Applications</div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="text-2xl font-bold text-blue-400">
                {applications.filter(app => app.status === "Applied").length}
              </div>
              <div className="text-muted-foreground text-sm">New Applications</div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="text-2xl font-bold text-yellow-400">
                {applications.filter(app => app.status === "Under Review").length}
              </div>
              <div className="text-muted-foreground text-sm">Under Review</div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="text-2xl font-bold text-green-400">
                {applications.filter(app => app.status === "Shortlisted").length}
              </div>
              <div className="text-muted-foreground text-sm">Shortlisted</div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="text-2xl font-bold text-purple-400">
                {applications.filter(app => app.status === "Hired").length}
              </div>
              <div className="text-muted-foreground text-sm">Hired</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-card rounded-lg p-6 mb-8 border border-border">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by job title, candidate name, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input outline-none transition-colors"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input outline-none transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="Applied">Applied</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Hired">Hired</option>
                </select>
                
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input outline-none transition-colors"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
                
                <Button
                  onClick={downloadApplicationsCSV}
                  variant="outline"
                  className="px-4 py-2.5"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download All Candidates
                </Button>
              </div>
            </div>
            
            {/* Custom Date Range */}
            {dateFilter === "custom" && (
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input outline-none transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Applications List Grouped by Job */}
          <div className="space-y-4">
            {Object.keys(groupedApplications).length === 0 ? (
              <div className="text-center py-20 bg-card rounded-lg border border-border">
                <div className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No applications found</h3>
                <p className="text-muted-foreground">
                  {applications.length === 0 
                    ? "You haven't received any applications yet." 
                    : "No applications match your current filters."}
                </p>
              </div>
            ) : (
              Object.values(groupedApplications).map((jobGroup) => {
                const isExpanded = expandedJobs.has(jobGroup.jobId);
                return (
                <motion.div
                    key={jobGroup.jobId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-lg border border-border overflow-hidden"
                  >
                    {/* Job Header */}
                    <div className="p-6 border-b border-border">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleJob(jobGroup.jobId)}
                          className="flex-1 text-left hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Briefcase className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-semibold">{jobGroup.job.title}</h2>
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-8">
                                <div className="flex items-center">
                                  <span>{jobGroup.job.company}</span>
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span>{jobGroup.job.location}</span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span>{jobGroup.job.employmentType}</span>
                                </div>
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                                  <span>{jobGroup.applications.length} candidate{jobGroup.applications.length !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className="ml-4 flex items-center gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadJobCandidatesCSV(jobGroup.applications, jobGroup.job.title);
                            }}
                            variant="outline"
                            size="sm"
                            className="h-8"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Candidates List */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-border"
                      >
                        <div className="p-4 space-y-3">
                          {jobGroup.applications.map((application) => (
                            <motion.div
                              key={application.id}
                              className="bg-background rounded-lg p-4 border border-border hover:bg-background/80 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Candidate Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <span className="text-base font-semibold text-primary">
                            {application.jobSeeker.fullName.charAt(0)}
                          </span>
                        </div>
                        
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-base font-semibold">
                            {application.jobSeeker.fullName}
                          </h3>
                                      <p className="text-muted-foreground text-sm truncate">{application.jobSeeker.email}</p>
                          
                                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                            {application.jobSeeker.currentJobTitle && (
                              <div className="flex items-center">
                                            <Briefcase className="h-3 w-3 mr-1" />
                                            <span className="truncate">{application.jobSeeker.currentJobTitle}</span>
                              </div>
                            )}
                            {application.jobSeeker.yearsOfExperience && (
                              <div className="flex items-center">
                                            <Clock className="h-3 w-3 mr-1" />
                                            <span>{application.jobSeeker.yearsOfExperience} exp</span>
                              </div>
                            )}
                            {application.jobSeeker.education && (
                              <div className="flex items-center">
                                            <GraduationCap className="h-3 w-3 mr-1" />
                                            <span className="truncate">{application.jobSeeker.education}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status and Actions */}
                                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)} whitespace-nowrap`}>
                        {application.status}
                      </span>
                      
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                        {getTimeAgo(application.appliedDate)}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setSelectedApplication(application)}
                          size="sm"
                          variant="outline"
                                      className="h-8"
                        >
                                      <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        
                        {(application.resumeUrl || application.jobSeeker.resume) && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={downloadingResume === application.jobSeeker.fullName}
                            onClick={() => downloadResume(
                              application.resumeUrl || application.jobSeeker.resume!, 
                              application.jobSeeker.fullName
                            )}
                                        className="h-8"
                          >
                            {downloadingResume === application.jobSeeker.fullName ? (
                                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                                          <Download className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20">
          <div className="bg-card rounded-lg max-w-4xl w-full max-h-[85vh] overflow-y-auto mt-4 border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Application Details</h2>
                <Button
                  onClick={() => setSelectedApplication(null)}
                  variant="ghost"
                  size="sm"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Candidate Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Candidate Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p>{selectedApplication.jobSeeker.fullName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p>{selectedApplication.jobSeeker.email}</p>
                  </div>
                  {selectedApplication.jobSeeker.phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p>{selectedApplication.jobSeeker.phone}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Job Title</label>
                    <p>{selectedApplication.jobSeeker.currentJobTitle || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Years of Experience</label>
                    <p>{selectedApplication.jobSeeker.yearsOfExperience || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Education</label>
                    <p>{selectedApplication.jobSeeker.education || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <p>
                      {[selectedApplication.jobSeeker.city, selectedApplication.jobSeeker.country].filter(Boolean).join(", ") || "Not specified"}
                    </p>
                  </div>
                </div>
                
                {selectedApplication.jobSeeker.skills.length > 0 && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-muted-foreground">Skills</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedApplication.jobSeeker.skills.map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-secondary rounded text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Application Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Application Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Applied Position</label>
                    <p>{selectedApplication.job.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Applied Date</label>
                    <p>{formatDate(selectedApplication.appliedDate)}</p>
                  </div>
                  {selectedApplication.expectedSalary && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Expected Salary</label>
                      <p>{selectedApplication.expectedSalary}</p>
                    </div>
                  )}
                  {selectedApplication.noticePeriod && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Notice Period</label>
                      <p>{selectedApplication.noticePeriod}</p>
                    </div>
                  )}
                  {selectedApplication.availabilityDate && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Available From</label>
                      <p>{selectedApplication.availabilityDate}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cover Letter */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Cover Letter</h3>
                <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                  <p className="whitespace-pre-line">{selectedApplication.coverLetter}</p>
                </div>
              </div>

              {/* Additional Information */}
              {(selectedApplication.portfolioUrl || selectedApplication.linkedinUrl || selectedApplication.githubUrl || selectedApplication.additionalNotes) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                  <div className="space-y-3">
                    {selectedApplication.portfolioUrl && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Portfolio</label>
                        <a href={selectedApplication.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block">
                          {selectedApplication.portfolioUrl}
                        </a>
                      </div>
                    )}
                    {selectedApplication.linkedinUrl && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">LinkedIn</label>
                        <a href={selectedApplication.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block">
                          {selectedApplication.linkedinUrl}
                        </a>
                      </div>
                    )}
                    {selectedApplication.githubUrl && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">GitHub</label>
                        <a href={selectedApplication.githubUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block">
                          {selectedApplication.githubUrl}
                        </a>
                      </div>
                    )}
                    {selectedApplication.additionalNotes && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Additional Notes</label>
                        <p className="whitespace-pre-line">{selectedApplication.additionalNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resume */}
              {(selectedApplication.resumeUrl || selectedApplication.jobSeeker.resume) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Resume</h3>
                  <div className="flex gap-2">
                    {selectedApplication.resumeUrl && (
                      <Button 
                        variant="outline"
                        disabled={downloadingResume === selectedApplication.jobSeeker.fullName}
                        onClick={() => downloadResume(selectedApplication.resumeUrl!, selectedApplication.jobSeeker.fullName)}
                      >
                        {downloadingResume === selectedApplication.jobSeeker.fullName ? (
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download Resume
                      </Button>
                    )}
                    {selectedApplication.jobSeeker.resume && !selectedApplication.resumeUrl && (
                      <Button 
                        variant="outline"
                        disabled={downloadingResume === selectedApplication.jobSeeker.fullName}
                        onClick={() => downloadResume(selectedApplication.jobSeeker.resume!, selectedApplication.jobSeeker.fullName)}
                      >
                        {downloadingResume === selectedApplication.jobSeeker.fullName ? (
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download Resume
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 