import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart3, AlertTriangle, Banknote, CalendarDays, MapPin, Users, Search, ChevronLeft } from 'lucide-react';
import { transliterateName } from '@/utils/transliterate';

export default function RestaurantCostReport() {
  const { t, language } = useLanguage();
  const displayName = (name: string) => (language === 'en' ? transliterateName(name) : name);
  const formatMoney = (value: number) => `${value.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { maximumFractionDigits: 2 })} ${t.costReportPage.currency}`;
  const listSeparator = language === 'ar' ? '، ' : ', ';

  const today = new Date().toLocaleDateString('en-CA');
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);

  const [startDate, setStartDate] = useState(firstOfMonth.toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(today);
  const [siteCostCenterId, setSiteCostCenterId] = useState('all');
  const [sourceGroupId, setSourceGroupId] = useState('all');
  const [siteId, setSiteId] = useState('all');
  const [selectedSiteId, setSelectedSiteId] = useState<number | 'unassigned' | null>(null);
  const [workerSearch, setWorkerSearch] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<any>(null);

  const { data: costCenters } = trpc.costCenters.list.useQuery();
  const { data: groups } = trpc.groups.list.useQuery();
  const { data: sites } = trpc.restaurants.list.useQuery({ includeInactive: true });

  const { data: report, isLoading } = trpc.restaurants.costReport.useQuery(
    {
      startDate,
      endDate,
      siteCostCenterId: siteCostCenterId !== 'all' ? Number(siteCostCenterId) : undefined,
      sourceGroupId: sourceGroupId !== 'all' ? Number(sourceGroupId) : undefined,
      siteId: siteId !== 'all' ? Number(siteId) : undefined,
    },
    { enabled: !!startDate && !!endDate && startDate <= endDate }
  );

  const filteredSites = useMemo(() => {
    if (siteCostCenterId === 'all') return sites || [];
    return (sites || []).filter((site: any) => String(site.costCenterId || '') === siteCostCenterId);
  }, [sites, siteCostCenterId]);

  const selectedDetail = useMemo(() => {
    if (!report || selectedSiteId === null) return null;
    if (selectedSiteId === 'unassigned') return report.unassigned ? { siteName: t.costReportPage.unspecified, ...report.unassigned } : null;
    return report.sites.find((site) => site.siteId === selectedSiteId) || null;
  }, [report, selectedSiteId, t.costReportPage.unspecified]);

  const detailWorkers = useMemo(() => {
    const workers = selectedDetail?.workers || [];
    const query = workerSearch.trim().toLowerCase();
    if (!query) return workers;
    return workers.filter((worker: any) =>
      worker.workerName.toLowerCase().includes(query) || worker.workerCode.toLowerCase().includes(query)
    );
  }, [selectedDetail, workerSearch]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> {t.costReportPage.title}
          </h1>
          <p className="text-muted-foreground">
            {t.costReportPage.subtitle}
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{t.costReportPage.periodAndFilters}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>{t.costReportPage.fromDate}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.costReportPage.toDate}</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.costReportPage.siteCostCenter}</Label>
                <Select value={siteCostCenterId} onValueChange={(value) => { setSiteCostCenterId(value); setSiteId('all'); setSelectedSiteId(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.costReportPage.allCostCenters}</SelectItem>
                    {costCenters?.map((cc: any) => <SelectItem key={cc.id} value={String(cc.id)}>{displayName(cc.name)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.costReportPage.workerGroup}</Label>
                <Select value={sourceGroupId} onValueChange={(value) => { setSourceGroupId(value); setSelectedSiteId(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.costReportPage.allGroups}</SelectItem>
                    {groups?.map((group: any) => {
                      const center = costCenters?.find((cc: any) => cc.id === group.costCenterId);
                      return <SelectItem key={group.id} value={String(group.id)}>{displayName(group.name)}{center ? ` — ${displayName(center.name)}` : ''}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.costReportPage.site}</Label>
                <Select value={siteId} onValueChange={(value) => { setSiteId(value); setSelectedSiteId(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.costReportPage.allSites}</SelectItem>
                    {filteredSites.map((site: any) => <SelectItem key={site.id} value={String(site.id)}> {displayName(site.name)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {startDate > endDate && <p className="text-sm text-destructive mt-3">{t.costReportPage.invalidDateRange}</p>}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Banknote className="h-4 w-4" />{t.costReportPage.cost}</div><div className="text-xl font-bold mt-2">{formatMoney(report?.totals.totalCost || 0)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" />{t.costReportPage.workers}</div><div className="text-2xl font-bold mt-2">{report?.totals.workerCount || 0}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{t.costReportPage.workDays}</div><div className="text-2xl font-bold mt-2">{report?.totals.workDays || 0}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">{t.costReportPage.approvedBatchesUsed}</div><div className="text-2xl font-bold mt-2">{report?.batchCount || 0}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{t.costReportPage.sites}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t.costReportPage.loading}</div>
            ) : !report?.sites.length && !report?.unassigned ? (
              <div className="text-center py-8 text-muted-foreground">{t.costReportPage.noApprovedData}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{t.costReportPage.site}</TableHead>
                      <TableHead className="text-right">{t.costReportPage.siteCenter}</TableHead>
                      <TableHead className="text-right">{t.costReportPage.workers}</TableHead>
                      <TableHead className="text-right">{t.costReportPage.workDays}</TableHead>
                      <TableHead className="text-right">{t.costReportPage.totalCost}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report?.sites.map((site) => (
                      <TableRow key={site.siteId} className="cursor-pointer" onClick={() => { setSelectedSiteId(site.siteId); setSelectedWorker(null); setWorkerSearch(''); }}>
                        <TableCell className="font-medium flex items-center gap-2"><MapPin className="h-4 w-4" />{displayName(site.siteName)}</TableCell>
                        <TableCell>{site.siteCostCenterName ? displayName(site.siteCostCenterName) : t.costReportPage.unlinked}</TableCell>
                        <TableCell>{site.workerCount}</TableCell>
                        <TableCell>{site.workDays}</TableCell>
                        <TableCell className="font-semibold">{formatMoney(site.totalCost)}</TableCell>
                        <TableCell><ChevronLeft className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    ))}
                    {report?.unassigned && (
                      <TableRow className="bg-yellow-50 dark:bg-yellow-950 cursor-pointer" onClick={() => { setSelectedSiteId('unassigned'); setSelectedWorker(null); setWorkerSearch(''); }}>
                        <TableCell className="font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-600" />{t.costReportPage.unspecified}</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>{report.unassigned.workerCount}</TableCell>
                        <TableCell>{report.unassigned.workDays}</TableCell>
                        <TableCell className="font-semibold">{formatMoney(report.unassigned.totalCost)}</TableCell>
                        <TableCell><ChevronLeft className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    )}
                    <TableRow className="bg-muted/50 font-bold border-t-2">
                      <TableCell>{t.costReportPage.total}</TableCell><TableCell></TableCell>
                      <TableCell>{report?.totals.workerCount || 0}</TableCell>
                      <TableCell>{report?.totals.workDays || 0}</TableCell>
                      <TableCell>{formatMoney(report?.totals.totalCost || 0)}</TableCell><TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedDetail && (
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle className="text-base">{t.costReportPage.workerDetails} — {displayName(selectedDetail.siteName)}</CardTitle>
                <div className="relative w-full md:w-72">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pr-9" placeholder={t.costReportPage.searchWorkerPlaceholder} value={workerSearch} onChange={(e) => setWorkerSearch(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{t.costReportPage.worker}</TableHead>
                      <TableHead className="text-right">{t.costReportPage.sourceGroup}</TableHead>
                      <TableHead className="text-right">{t.costReportPage.operationalGroup}</TableHead>
                      <TableHead className="text-right">{t.costReportPage.workPeriods}</TableHead>
                      <TableHead className="text-right">{t.costReportPage.workDays}</TableHead>
                      <TableHead className="text-right">{t.costReportPage.cost}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailWorkers.map((worker: any) => (
                      <TableRow key={worker.workerId} className="cursor-pointer" onClick={() => setSelectedWorker(worker)}>
                        <TableCell><div className="font-medium">{displayName(worker.workerName)}</div><div className="text-xs text-muted-foreground">{worker.workerCode}</div></TableCell>
                        <TableCell>{worker.sourceGroups.map((name: string) => displayName(name)).join(listSeparator) || '—'}</TableCell>
                        <TableCell>{worker.operationalGroups.map((name: string) => displayName(name)).join(listSeparator) || t.costReportPage.noTransfer}</TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            {worker.periods.map((period: any, index: number) => (
                              <div key={`${period.startDate}-${period.endDate}-${index}`}>
                                {period.startDate === period.endDate ? period.startDate : `${period.startDate} → ${period.endDate}`}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{worker.workDays}</TableCell>
                        <TableCell className="font-semibold">{formatMoney(worker.totalCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedWorker && (
                <div className="rounded-lg border p-4 bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="font-semibold">{t.costReportPage.workerDaysAtSite.replace('{worker}', displayName(selectedWorker.workerName))}</div>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedWorker(null)}>{t.costReportPage.close}</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorker.dates.map((date: string) => <Badge key={date} variant="outline">{date}</Badge>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
