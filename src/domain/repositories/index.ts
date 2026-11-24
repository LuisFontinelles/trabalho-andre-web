import type {
  Application,
  CurrentUser,
  FilterCatalog,
  LoginResult,
  OpportunityPage,
  Opportunity,
  PendingVerification,
  PendingProfessional,
  ProfessionalCatalog,
  SearchCriteria,
  SignUpDraft,
} from '@/domain/entities'

/** Protocolos que o dominio declara e a camada de dados cumpre. */

export interface AuthRepository {
  login(email: string, password: string): Promise<LoginResult>
  me(): Promise<CurrentUser>
  signUp(draft: SignUpDraft): Promise<PendingVerification>
  registerProfessional(
    draft: SignUpDraft,
    biographyOrDescription: string,
    documents: readonly File[],
  ): Promise<PendingVerification>
  verify(email: string, code: string): Promise<void>
  resendCode(email: string): Promise<void>
  /** Solicita o codigo de nova senha. Nao diz se o e-mail tem conta. */
  requestPasswordReset(email: string): Promise<void>
  confirmPasswordReset(email: string, code: string, newPassword: string): Promise<void>
  deleteAccount(password: string): Promise<void>
  professionalCatalog(): Promise<ProfessionalCatalog>
}

export interface AdminRepository {
  pendingProfessionals(): Promise<readonly PendingProfessional[]>
  approveProfessional(id: string): Promise<PendingProfessional>
  rejectProfessional(id: string): Promise<PendingProfessional>
}

export interface OpportunityRepository {
  search(criteria: SearchCriteria): Promise<OpportunityPage>
  detail(id: string): Promise<Opportunity>
  filters(): Promise<FilterCatalog>
}

export interface ApplicationRepository {
  status(id: string): Promise<Application>
}
