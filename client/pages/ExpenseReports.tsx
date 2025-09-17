import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Filter, TrendingUp, DollarSign, FileText, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getExpenseReport, getSocieties } from "@/lib/api";
import { toast } from "sonner";
import type { ExpenseReport, ExpenseReportFilters, BillStatus } from "../../shared/api";

interface Society {
  id: string;
  name: string;
}

export default function ExpenseReports() {
  const { user } = useAuth();
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ExpenseReportFilters>({});
  
  const statusOptions: BillStatus[] = ["Pending", "Under Review", "Clarification Required", "Approved", "Rejected"];

  useEffect(() => {
    fetchSocieties();
    generateReport();
  }, []);

  const fetchSocieties = async () => {
    try {
      const data = await getSocieties();
      setSocieties(data);
    } catch (error) {
      toast.error("Failed to fetch societies");
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const data = await getExpenseReport(filters);
      setReport(data);
    } catch (error) {
      toast.error("Failed to generate expense report");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const timestamp = value ? new Date(value).getTime().toString() : undefined;
    setFilters(prev => ({ ...prev, [field]: timestamp }));
  };

  const handleFilterChange = (field: keyof ExpenseReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value || undefined }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const exportReport = () => {
    if (!report) return;
    
    const csvContent = [
      ['Expense Report'],
      ['Generated on', new Date().toLocaleString()],
      [''],
      ['Summary'],
      ['Total Amount', report.summary.totalAmount],
      ['Total Bills', report.summary.totalBills],
      ['Average Amount', report.summary.averageAmount],
      [''],
      ['Bills'],
      ['Vendor', 'Amount', 'Status', 'Date', 'Society'],
      ...report.bills.map(bill => [
        bill.vendorName,
        bill.amount,
        bill.status,
        new Date(bill.createdAt).toLocaleDateString(),
        Object.keys(report.bySociety).find(society => 
          report.bySociety[society] === bill.amount
        ) || 'Unknown'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!user || !["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"].includes(user.role)) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
              <p className="text-gray-600">Only authorized users can access expense reports.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expense Reports</h1>
          <p className="text-gray-600">Generate detailed expense reports with date filtering</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={clearFilters} variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
          <Button onClick={generateReport} disabled={loading}>
            <Calendar className="w-4 h-4 mr-2" />
            {loading ? "Generating..." : "Generate Report"}
          </Button>
          {report && (
            <Button onClick={exportReport} variant="secondary">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Filter the expense report by date range, society, and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate ? new Date(parseInt(filters.startDate)).toISOString().split('T')[0] : ''}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate ? new Date(parseInt(filters.endDate)).toISOString().split('T')[0] : ''}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="society">Society</Label>
              <Select value={filters.societyId || "all"} onValueChange={(value) => handleFilterChange('societyId', value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Societies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Societies</SelectItem>
                  {societies.map((society) => (
                    <SelectItem key={society.id} value={society.id}>
                      {society.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange('status', value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{report.summary.totalAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Across {report.summary.totalBills} bills
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{report.summary.averageAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Per bill
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalBills}</div>
                <p className="text-xs text-muted-foreground">
                  Bills in selected period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Status</CardTitle>
              <CardDescription>Breakdown of expenses by bill status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(report.byStatus).map(([status, amount]) => (
                  <div key={status} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <Badge variant="outline" className="text-gray-700">{status}</Badge>
                    <span className="font-medium text-gray-900">₹{amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Breakdown by Society */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Society</CardTitle>
              <CardDescription>Breakdown of expenses by society</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(report.bySociety).map(([society, amount]) => (
                  <div key={society} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{society}</span>
                    </div>
                    <span className="font-medium text-gray-900">₹{amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Bills List */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Bills</CardTitle>
              <CardDescription>Complete list of bills in the report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.bills.map((bill: any) => (
                  <div key={bill.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{bill.vendorName}</h3>
                        <p className="text-sm text-gray-600">{bill.transactionNature}</p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(bill.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">₹{bill.amount.toLocaleString()}</div>
                        <Badge variant={bill.status === 'Approved' ? 'default' : 'secondary'}>
                          {bill.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
