import type {
  Application,
  FilterCatalog,
  OpportunityPage,
  Opportunity,
  PendingVerification,
  ProfessionalCatalog,
  SearchCriteria,
  Session,
  SignUpDraft,
} from '@/domain/entities'

/** Protocolos que o dominio declara e a camada de dados cumpre. */

export interface AuthRepository {
  login(email: string, password: string): Promise<Session>
  loginWithGoogle(): Promise<Session>
  signUp(draft: SignUpDraft): Promise<PendingVerification>
  verify(email: string, code: string): Promise<Session>
  resendCode(email: string): Promise<void>
  professionalCatalog(): Promise<ProfessionalCatalog>
}

export interface OpportunityRepository {
  search(criteria: SearchCriteria): Promise<OpportunityPage>
  detail(id: string): Promise<Opportunity>
  filters(): Promise<FilterCatalog>
}

export interface ApplicationRepository {
  status(id: string): Promise<Application>
}
