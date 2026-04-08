import { findUserWithOrgByAuthId, getSupabaseAdminClient, toDate } from "@/lib/supabase/admin-repository-helpers";
import type {
  TrainingModuleRecord,
  TrainingProgressRecord,
  TrainingRepository,
} from "./service";

export class SupabaseTrainingRepository implements TrainingRepository {
  constructor(private readonly supabase = getSupabaseAdminClient()) {}

  async countModulesByOrgId(orgId: string) {
    const supabase: any = this.supabase;
    const { count, error } = await supabase
      .from("training_modules")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  }

  async createModules(
    modules: Array<{
      orgId: string;
      title: string;
      description: string;
      skillCategory: string;
      videoUrl: string | null;
      quizData: {
        questions: Array<{ question: string; options: string[]; correctIndex: number }>;
      } | null;
      orderIndex: number;
    }>,
  ) {
    if (!modules.length) {
      return;
    }

    const supabase: any = this.supabase;
    const { error } = await supabase.from("training_modules").insert(
      modules.map((module) => ({
        org_id: module.orgId,
        title: module.title,
        description: module.description,
        skill_category: module.skillCategory,
        video_url: module.videoUrl,
        quiz_data: module.quizData,
        order_index: module.orderIndex,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  async createModule(input: {
    orgId: string;
    title: string;
    description: string;
    skillCategory: string;
    videoUrl: string | null;
    quizData: {
      questions: Array<{ question: string; options: string[]; correctIndex: number }>;
    } | null;
    orderIndex: number;
  }): Promise<TrainingModuleRecord> {
    void input;
    throw new Error("TrainingRepository.createModule is not implemented in SupabaseTrainingRepository");
  }

  async findCurrentUserByAuthId(authUserId: string) {
    const user = await findUserWithOrgByAuthId(authUserId, this.supabase);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      org: user.org
        ? {
            id: user.org.id,
            name: user.org.name,
            slug: user.org.slug,
            plan: user.org.plan,
          }
        : null,
    };
  }

  async findModulesByOrgId(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("training_modules")
      .select("id, org_id, title, skill_category, video_url, description, quiz_data, order_index, created_at")
      .eq("org_id", orgId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      orgId: row.org_id,
      title: row.title,
      skillCategory: row.skill_category,
      videoUrl: row.video_url,
      description: row.description,
      quizData: row.quiz_data && typeof row.quiz_data === "object" ? row.quiz_data : null,
      orderIndex: row.order_index,
      createdAt: toDate(row.created_at) ?? new Date(0),
    }));
  }

  async findModuleById(moduleId: string): Promise<TrainingModuleRecord | null> {
    void moduleId;
    throw new Error("TrainingRepository.findModuleById is not implemented in SupabaseTrainingRepository");
  }

  async findProgressByModuleId(moduleId: string): Promise<TrainingProgressRecord[]> {
    void moduleId;
    throw new Error("TrainingRepository.findProgressByModuleId is not implemented in SupabaseTrainingRepository");
  }

  async findProgressByRepId(repId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("training_progress")
      .select("id, rep_id, module_id, status, score, attempts, completed_at, assigned_by, assigned_at, due_date")
      .eq("rep_id", repId);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      repId: row.rep_id,
      moduleId: row.module_id,
      status: row.status,
      score: row.score,
      attempts: row.attempts ?? 0,
      completedAt: toDate(row.completed_at),
      assignedBy: row.assigned_by,
      assignedAt: toDate(row.assigned_at),
      dueDate: toDate(row.due_date),
    }));
  }

  async findRepIdsByOrgId(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("org_id", orgId)
      .eq("role", "rep");

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row: any) => row.id);
  }

  async findTeamProgressByOrgId(orgId: string) {
    const supabase: any = this.supabase;
    const [{ data: members, error: membersError }, { data: progressRows, error: progressError }] =
      await Promise.all([
        supabase
          .from("users")
          .select("id, first_name, last_name, email")
          .eq("org_id", orgId),
        supabase
          .from("training_progress")
          .select("rep_id, status")
          .in(
            "rep_id",
            (
              (
                await supabase.from("users").select("id").eq("org_id", orgId)
              ).data ?? []
            ).map((row: any) => row.id),
          ),
      ]);

    if (membersError) {
      throw new Error(membersError.message);
    }

    if (progressError) {
      throw new Error(progressError.message);
    }

    return (members ?? []).map((member: any) => {
      const progress = (progressRows ?? []).filter((row: any) => row.rep_id === member.id);
      const assigned = progress.length;
      const passed = progress.filter((row: any) => row.status === "passed").length;

      return {
        repId: member.id,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        assigned,
        passed,
        completionRate: assigned > 0 ? Math.round((passed / assigned) * 100) : 0,
      };
    });
  }

  async updateModule(
    moduleId: string,
    input: {
      title: string;
      description: string;
      skillCategory: string;
      videoUrl: string | null;
      quizData: {
        questions: Array<{ question: string; options: string[]; correctIndex: number }>;
      } | null;
    },
  ): Promise<TrainingModuleRecord> {
    void moduleId;
    void input;
    throw new Error("TrainingRepository.updateModule is not implemented in SupabaseTrainingRepository");
  }

  async assignModuleToRepIds(input: {
    moduleId: string;
    repIds: string[];
    assignedBy: string;
    dueDate: Date | null;
  }): Promise<void> {
    void input;
    throw new Error("TrainingRepository.assignModuleToRepIds is not implemented in SupabaseTrainingRepository");
  }

  async removeModuleAssignmentsForRepIds(input: {
    moduleId: string;
    repIds: string[];
  }): Promise<void> {
    void input;
    throw new Error("TrainingRepository.removeModuleAssignmentsForRepIds is not implemented in SupabaseTrainingRepository");
  }

  async upsertProgress(input: {
    moduleId: string;
    repId: string;
    score: number | null;
    status: "assigned" | "in_progress" | "passed" | "failed";
  }) {
    const supabase: any = this.supabase;
    const { data: existing, error: existingError } = await supabase
      .from("training_progress")
      .select("id, attempts, completed_at, assigned_by, assigned_at, due_date")
      .eq("rep_id", input.repId)
      .eq("module_id", input.moduleId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      const { data, error } = await supabase
        .from("training_progress")
        .update({
          status: input.status,
          score: input.score,
          attempts: (existing.attempts ?? 0) + 1,
          completed_at:
            input.status === "passed"
              ? new Date().toISOString()
              : existing.completed_at,
        })
        .eq("id", existing.id)
        .select("id, rep_id, module_id, status, score, attempts, completed_at, assigned_by, assigned_at, due_date")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        id: data.id,
        repId: data.rep_id,
        moduleId: data.module_id,
        status: data.status,
        score: data.score,
        attempts: data.attempts ?? 0,
        completedAt: toDate(data.completed_at),
        assignedBy: data.assigned_by,
        assignedAt: toDate(data.assigned_at),
        dueDate: toDate(data.due_date),
      };
    }

    const { data, error } = await supabase
      .from("training_progress")
      .insert({
        rep_id: input.repId,
        module_id: input.moduleId,
        status: input.status,
        score: input.score,
        attempts: 1,
        completed_at: input.status === "passed" ? new Date().toISOString() : null,
      })
      .select("id, rep_id, module_id, status, score, attempts, completed_at, assigned_by, assigned_at, due_date")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      repId: data.rep_id,
      moduleId: data.module_id,
      status: data.status,
      score: data.score,
      attempts: data.attempts ?? 0,
      completedAt: toDate(data.completed_at),
      assignedBy: data.assigned_by,
      assignedAt: toDate(data.assigned_at),
      dueDate: toDate(data.due_date),
    };
  }
}
