import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Link2, MapPinned, Pencil, Plus, Power, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { transliterateName } from '@/utils/transliterate';
import { useAuth } from '@/_core/hooks/useAuth';

export default function RestaurantsManagement() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const canManageStructure = user?.role === 'super_admin' || user?.role === 'admin_affairs';
  const displayName = (name: string) => (language === 'en' ? transliterateName(name) : name);

  const [departmentName, setDepartmentName] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [showDepartmentCreate, setShowDepartmentCreate] = useState(false);
  const [showDepartmentEdit, setShowDepartmentEdit] = useState(false);

  const [siteName, setSiteName] = useState('');
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [showSiteCreate, setShowSiteCreate] = useState(false);
  const [showSiteEdit, setShowSiteEdit] = useState(false);

  const [linkSiteId, setLinkSiteId] = useState('');
  const [linkDepartmentId, setLinkDepartmentId] = useState('');
  const [linkCostCenterId, setLinkCostCenterId] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [costCenterFilter, setCostCenterFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const { data: costCenters } = trpc.costCenters.list.useQuery(undefined, { enabled: canManageStructure });
  const { data: sitesList, refetch: refetchSites } = trpc.restaurants.list.useQuery(
    { includeInactive: true },
    { enabled: canManageStructure }
  );
  const { data: departments, refetch: refetchDepartments } = trpc.restaurants.departments.useQuery(
    { includeInactive: true },
    { enabled: canManageStructure }
  );

  const createDepartmentMutation = trpc.restaurants.createDepartment.useMutation({
    onSuccess: () => {
      toast.success(t.restaurantsPage.createDepartmentSuccess);
      refetchDepartments();
      setShowDepartmentCreate(false);
      setDepartmentName('');
    },
    onError: (error) => toast.error(error.message || t.restaurantsPage.genericError),
  });

  const updateDepartmentMutation = trpc.restaurants.updateDepartment.useMutation({
    onSuccess: () => {
      toast.success(t.restaurantsPage.updateDepartmentSuccess);
      refetchDepartments();
      setShowDepartmentEdit(false);
      setSelectedDepartment(null);
      setDepartmentName('');
    },
    onError: (error) => toast.error(error.message || t.restaurantsPage.genericError),
  });

  const deleteDepartmentMutation = trpc.restaurants.deleteDepartment.useMutation({
    onSuccess: () => {
      toast.success(t.restaurantsPage.deleteDepartmentSuccess);
      refetchDepartments();
    },
    onError: (error) => toast.error(error.message || t.restaurantsPage.genericError),
  });

  const createSiteMutation = trpc.restaurants.create.useMutation({
    onSuccess: () => {
      toast.success(t.restaurantsPage.createSiteSuccess);
      refetchSites();
      setShowSiteCreate(false);
      setSiteName('');
    },
    onError: (error) => toast.error(error.message || t.restaurantsPage.genericError),
  });

  const updateSiteMutation = trpc.restaurants.update.useMutation({
    onSuccess: () => {
      toast.success(t.restaurantsPage.updateSiteSuccess);
      refetchSites();
      setShowSiteEdit(false);
      setSelectedSite(null);
      setSiteName('');
    },
    onError: (error) => toast.error(error.message || t.restaurantsPage.genericError),
  });

  const linkSiteMutation = trpc.restaurants.update.useMutation({
    onSuccess: () => {
      toast.success(t.restaurantsPage.linkSavedSuccess);
      refetchSites();
    },
    onError: (error) => toast.error(error.message || t.restaurantsPage.genericError),
  });

  const deleteSiteMutation = trpc.restaurants.delete.useMutation({
    onSuccess: (data) => {
      toast.success(data.softDeleted ? t.restaurantsPage.deactivateSiteSuccess : t.restaurantsPage.deleteSiteSuccess);
      refetchSites();
    },
    onError: (error) => toast.error(error.message || t.restaurantsPage.genericError),
  });

  const filteredSites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (sitesList || []).filter((site: any) => {
      if (query && !String(site.name).toLowerCase().includes(query)) return false;
      if (costCenterFilter !== 'all' && String(site.costCenterId || '') !== costCenterFilter) return false;
      if (departmentFilter !== 'all' && String(site.operationalDepartmentId || '') !== departmentFilter) return false;
      return true;
    });
  }, [sitesList, searchQuery, costCenterFilter, departmentFilter]);

  const activeSites = useMemo(() => (sitesList || []).filter((site: any) => !!site.isActive), [sitesList]);
  const activeDepartments = useMemo(() => (departments || []).filter((department: any) => !!department.isActive), [departments]);

  const openDepartmentEdit = (department: any) => {
    setSelectedDepartment(department);
    setDepartmentName(department.name);
    setShowDepartmentEdit(true);
  };

  const openSiteEdit = (site: any) => {
    setSelectedSite(site);
    setSiteName(site.name);
    setShowSiteEdit(true);
  };

  const selectSiteForLink = (value: string) => {
    setLinkSiteId(value);
    const site = (sitesList || []).find((row: any) => String(row.id) === value);
    setLinkDepartmentId(site?.operationalDepartmentId ? String(site.operationalDepartmentId) : '');
    setLinkCostCenterId(site?.costCenterId ? String(site.costCenterId) : '');
  };

  const saveLink = () => {
    if (!linkSiteId) return toast.error(t.restaurantsPage.linkSiteRequired);
    if (!linkDepartmentId) return toast.error(t.restaurantsPage.departmentRequired);
    if (!linkCostCenterId) return toast.error(t.restaurantsPage.costCenterRequired);

    linkSiteMutation.mutate({
      id: Number(linkSiteId),
      operationalDepartmentId: Number(linkDepartmentId),
      costCenterId: Number(linkCostCenterId),
    });
  };

  if (!canManageStructure) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>غير مصرح</CardTitle>
            <CardDescription>
              إدارة الأقسام ومواقع التشغيل متاحة للشؤون الإدارية والسوبر أدمن فقط.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPinned className="h-6 w-6" />
            {t.restaurantsPage.structureTitle}
          </h1>
          <p className="text-muted-foreground">{t.restaurantsPage.structureSubtitle}</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> {t.restaurantsPage.departmentsTitle}
              </CardTitle>
              <CardDescription>{t.restaurantsPage.departmentsSubtitle}</CardDescription>
            </div>
            <Button onClick={() => { setDepartmentName(''); setShowDepartmentCreate(true); }}>
              <Plus className="h-4 w-4 ml-2" /> {t.restaurantsPage.addDepartment}
            </Button>
          </CardHeader>
          <CardContent>
            {!departments?.length ? (
              <p className="py-6 text-center text-muted-foreground">{t.restaurantsPage.noDepartments}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{t.restaurantsPage.departmentColumn}</TableHead>
                      <TableHead className="text-right">{t.restaurantsPage.statusColumn}</TableHead>
                      <TableHead className="text-right">{t.restaurantsPage.actionsColumn}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((department: any) => (
                      <TableRow key={department.id}>
                        <TableCell className="font-medium">{displayName(department.name)}</TableCell>
                        <TableCell>
                          {department.isActive
                            ? <Badge className="bg-green-100 text-green-800">{t.restaurantsPage.active}</Badge>
                            : <Badge className="bg-gray-100 text-gray-800">{t.restaurantsPage.inactive}</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => openDepartmentEdit(department)}>
                              <Pencil className="h-4 w-4 ml-1" />{t.restaurantsPage.edit}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateDepartmentMutation.mutate({ id: department.id, isActive: !department.isActive })}
                            >
                              <Power className="h-4 w-4 ml-1" />
                              {department.isActive ? t.restaurantsPage.deactivate : t.restaurantsPage.activate}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`${t.restaurantsPage.confirmDeleteDepartment} "${displayName(department.name)}"?`)) {
                                  deleteDepartmentMutation.mutate({ id: department.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 ml-1" />{t.restaurantsPage.delete}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPinned className="h-5 w-5" /> {t.restaurantsPage.sitesMasterTitle}
              </CardTitle>
              <CardDescription>{t.restaurantsPage.sitesMasterSubtitle}</CardDescription>
            </div>
            <Button onClick={() => { setSiteName(''); setShowSiteCreate(true); }}>
              <Plus className="h-4 w-4 ml-2" /> {t.restaurantsPage.addSite}
            </Button>
          </CardHeader>
          <CardContent>
            {!sitesList?.length ? (
              <p className="py-6 text-center text-muted-foreground">{t.restaurantsPage.noSites}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{t.restaurantsPage.nameColumn}</TableHead>
                      <TableHead className="text-right">{t.restaurantsPage.linkStatusColumn}</TableHead>
                      <TableHead className="text-right">{t.restaurantsPage.statusColumn}</TableHead>
                      <TableHead className="text-right">{t.restaurantsPage.actionsColumn}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sitesList.map((site: any) => {
                      const linked = !!site.costCenterId && !!site.operationalDepartmentId;
                      return (
                        <TableRow key={site.id}>
                          <TableCell className="font-medium">{displayName(site.name)}</TableCell>
                          <TableCell>
                            {linked
                              ? <Badge variant="outline">{t.restaurantsPage.linked}</Badge>
                              : <Badge variant="destructive">{t.restaurantsPage.unlinked}</Badge>}
                          </TableCell>
                          <TableCell>
                            {site.isActive
                              ? <Badge className="bg-green-100 text-green-800">{t.restaurantsPage.active}</Badge>
                              : <Badge className="bg-gray-100 text-gray-800">{t.restaurantsPage.inactive}</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => openSiteEdit(site)}>
                                <Pencil className="h-4 w-4 ml-1" />{t.restaurantsPage.edit}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateSiteMutation.mutate({ id: site.id, isActive: !site.isActive })}
                              >
                                <Power className="h-4 w-4 ml-1" />
                                {site.isActive ? t.restaurantsPage.deactivate : t.restaurantsPage.activate}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`${t.restaurantsPage.confirmDeleteSite} "${displayName(site.name)}"?`)) {
                                    deleteSiteMutation.mutate({ id: site.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 ml-1" />{t.restaurantsPage.delete}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" /> {t.restaurantsPage.linkageTitle}
            </CardTitle>
            <CardDescription>{t.restaurantsPage.linkageSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end rounded-lg border p-4">
              <div className="space-y-2">
                <Label>{t.restaurantsPage.siteLabel}</Label>
                <Select value={linkSiteId} onValueChange={selectSiteForLink}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={t.restaurantsPage.selectSite} /></SelectTrigger>
                  <SelectContent>
                    {activeSites.map((site: any) => (
                      <SelectItem key={site.id} value={String(site.id)}>{displayName(site.name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.restaurantsPage.departmentLabel}</Label>
                <Select value={linkDepartmentId} onValueChange={setLinkDepartmentId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={t.restaurantsPage.selectDepartment} /></SelectTrigger>
                  <SelectContent>
                    {activeDepartments.map((department: any) => (
                      <SelectItem key={department.id} value={String(department.id)}>{displayName(department.name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.restaurantsPage.costCenterLabel}</Label>
                <Select value={linkCostCenterId} onValueChange={setLinkCostCenterId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={t.restaurantsPage.selectCostCenter} /></SelectTrigger>
                  <SelectContent>
                    {costCenters?.map((cc: any) => (
                      <SelectItem key={cc.id} value={String(cc.id)}>{displayName(cc.name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveLink} disabled={linkSiteMutation.isPending}>
                {linkSiteMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin ml-2" />}
                {t.restaurantsPage.saveLink}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_220px_auto] gap-3 items-end">
              <div className="space-y-2">
                <Label>{t.restaurantsPage.searchLabel}</Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute right-3 top-3 text-muted-foreground" />
                  <Input className="pr-9" placeholder={t.restaurantsPage.searchSitePlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.restaurantsPage.departmentLabel}</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.restaurantsPage.allDepartments}</SelectItem>
                    {departments?.map((department: any) => (
                      <SelectItem key={department.id} value={String(department.id)}>{displayName(department.name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.restaurantsPage.costCenterLabelShort}</Label>
                <Select value={costCenterFilter} onValueChange={setCostCenterFilter}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.restaurantsPage.allCostCenters}</SelectItem>
                    {costCenters?.map((cc: any) => (
                      <SelectItem key={cc.id} value={String(cc.id)}>{displayName(cc.name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" onClick={() => { refetchSites(); refetchDepartments(); }} title={t.restaurantsPage.refresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{t.restaurantsPage.nameColumn}</TableHead>
                    <TableHead className="text-right">{t.restaurantsPage.departmentColumn}</TableHead>
                    <TableHead className="text-right">{t.restaurantsPage.costCenterColumn}</TableHead>
                    <TableHead className="text-right">{t.restaurantsPage.statusColumn}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.map((site: any) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{displayName(site.name)}</TableCell>
                      <TableCell>
                        {site.operationalDepartmentName
                          ? displayName(site.operationalDepartmentName)
                          : <Badge variant="destructive">{t.restaurantsPage.unlinked}</Badge>}
                      </TableCell>
                      <TableCell>
                        {site.costCenterName
                          ? displayName(site.costCenterName)
                          : <Badge variant="destructive">{t.restaurantsPage.unlinked}</Badge>}
                      </TableCell>
                      <TableCell>
                        {site.isActive
                          ? <Badge className="bg-green-100 text-green-800">{t.restaurantsPage.active}</Badge>
                          : <Badge className="bg-gray-100 text-gray-800">{t.restaurantsPage.inactive}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDepartmentCreate} onOpenChange={setShowDepartmentCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.restaurantsPage.addDepartmentDialogTitle}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">
            <Label>{t.restaurantsPage.departmentNameLabel}</Label>
            <Input value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} placeholder={t.restaurantsPage.departmentNamePlaceholder} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepartmentCreate(false)}>{t.restaurantsPage.cancel}</Button>
            <Button
              onClick={() => {
                if (!departmentName.trim()) return toast.error(t.restaurantsPage.departmentRequired);
                createDepartmentMutation.mutate({ name: departmentName });
              }}
              disabled={createDepartmentMutation.isPending}
            >
              {createDepartmentMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin ml-2" />}
              {t.restaurantsPage.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDepartmentEdit} onOpenChange={setShowDepartmentEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.restaurantsPage.editDepartmentDialogTitle}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">
            <Label>{t.restaurantsPage.departmentNameLabel}</Label>
            <Input value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepartmentEdit(false)}>{t.restaurantsPage.cancel}</Button>
            <Button
              onClick={() => {
                if (!selectedDepartment || !departmentName.trim()) return toast.error(t.restaurantsPage.departmentRequired);
                updateDepartmentMutation.mutate({ id: selectedDepartment.id, name: departmentName });
              }}
              disabled={updateDepartmentMutation.isPending}
            >
              {updateDepartmentMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin ml-2" />}
              {t.restaurantsPage.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSiteCreate} onOpenChange={setShowSiteCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.restaurantsPage.addSiteDialogTitle}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">
            <Label>{t.restaurantsPage.siteNameLabel}</Label>
            <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder={t.restaurantsPage.siteNamePlaceholder} />
            <p className="text-xs text-muted-foreground">{t.restaurantsPage.siteCreateHint}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSiteCreate(false)}>{t.restaurantsPage.cancel}</Button>
            <Button
              onClick={() => {
                if (!siteName.trim()) return toast.error(t.restaurantsPage.siteNameRequired);
                createSiteMutation.mutate({ name: siteName, siteType: 'site' });
              }}
              disabled={createSiteMutation.isPending}
            >
              {createSiteMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin ml-2" />}
              {t.restaurantsPage.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSiteEdit} onOpenChange={setShowSiteEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.restaurantsPage.editSiteDialogTitle}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">
            <Label>{t.restaurantsPage.siteNameLabel}</Label>
            <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSiteEdit(false)}>{t.restaurantsPage.cancel}</Button>
            <Button
              onClick={() => {
                if (!selectedSite || !siteName.trim()) return toast.error(t.restaurantsPage.siteNameRequired);
                updateSiteMutation.mutate({ id: selectedSite.id, name: siteName });
              }}
              disabled={updateSiteMutation.isPending}
            >
              {updateSiteMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin ml-2" />}
              {t.restaurantsPage.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
