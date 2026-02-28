import api from './index';

export const collectovault = {
  // Point Rules
  getPointRules: (vendorId: string) => api.get(`/pointRules/${vendorId}`),
  getPointRulesById: (id: string) => api.get(`/pointRules/${id}`),

  savePointRule: (vendorId: string, data: any) =>
    data.id ? api.put(`/pointRules/update/${data.id}`, data) : api.post(`/pointRules/create/${vendorId}`, data),
  updatePointRule: (ruleId: number, data: any) => api.put(`/pointRules/update/${ruleId}`, data),
  deletePointRule: (ruleId: number) => api.delete(`/pointRules/delete/${ruleId}`),

  // Tier Rules
  getTierRules: (vendorId: string) => api.get(`/tier/${vendorId}`),
  getTierRuleById: (id: string) => api.get(`/tier/${id}`),
  saveTierRule: (vendorId: string, data: any) =>
    data.id ? api.put(`/tier/update/${data.id}`, data) : api.post(`/tier/create/${vendorId}`, data),
  updateTierRule: (tierId: number, data: any) => api.put(`/tier/update/${tierId}`, data),
  deleteTierRules: (ruleId: number) => api.delete(`/tier/delete/${ruleId}`),

  // Vault Packages
  getPackages: (vendorId: string) => api.get(`/vaultPackages/${vendorId}`),
  getPackageById: (id: string) => api.get(`/vaultPackages/${id}`),
  savePackages: (vendorId: string, data: any) =>
    data.id
      ? api.put(`/vaultPackages/update/${data.id}`, { ...data, collectoId: vendorId })
      : api.post(`/vaultPackages/create/${vendorId}`, { ...data, collectoId: vendorId }),
  updatePackages: (packageId: number, data: any) => api.put(`/vaultPackages/update/${packageId}`, data),
  deletePackages: (ruleId: number) => api.delete(`/vaultPackages/delete/${ruleId}`),
};
