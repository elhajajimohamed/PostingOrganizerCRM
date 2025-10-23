import { GroupStateService, GroupState } from './group-state-service';
import { EnhancedSchedulingConfig } from '@/lib/types';

export interface RampUpPhase {
  name: string;
  maxPostsPerPeriod: number;
  periodHours: number;
  minIntervalHours: number;
  description: string;
}

export interface RampUpConfig {
  week1MaxPosts: number;
  week2MaxPosts: number;
  initialDelayHours: number;
  phases: RampUpPhase[];
}

export class RampUpService {
  // Default ramp-up configuration
  private static getDefaultRampUpConfig(): RampUpConfig {
    return {
      week1MaxPosts: 1,
      week2MaxPosts: 1,
      initialDelayHours: 48,
      phases: [
        {
          name: 'Initial',
          maxPostsPerPeriod: 1,
          periodHours: 120, // 5 days
          minIntervalHours: 48,
          description: 'First 1-2 posts with 48-120 hour spacing',
        },
        {
          name: 'Week 2',
          maxPostsPerPeriod: 1,
          periodHours: 72, // 3 days
          minIntervalHours: 48,
          description: 'Maximum 1 post per 48-72 hours',
        },
      ],
    };
  }

  // Check if group is in ramp-up period
  static isGroupInRampUp(groupState: GroupState): boolean {
    return !!(groupState.initial_ramp_until && new Date() < groupState.initial_ramp_until);
  }

  // Get current ramp-up phase for group
  static getCurrentRampUpPhase(
    groupState: GroupState,
    config: RampUpConfig = this.getDefaultRampUpConfig()
  ): RampUpPhase | null {
    if (!this.isGroupInRampUp(groupState)) {
      return null;
    }

    const now = new Date();
    const rampStart = groupState.created_at;
    const hoursInRamp = (now.getTime() - rampStart.getTime()) / (1000 * 60 * 60);

    if (hoursInRamp < config.initialDelayHours) {
      return {
        name: 'Initial Delay',
        maxPostsPerPeriod: 0,
        periodHours: config.initialDelayHours,
        minIntervalHours: config.initialDelayHours,
        description: 'Initial delay period before first post',
      };
    }

    // Determine phase based on time in ramp
    const totalRampHours = config.phases.reduce((sum, phase) => sum + phase.periodHours, 0) + config.initialDelayHours;

    if (hoursInRamp < totalRampHours) {
      let currentPhaseIndex = 0;
      let phaseStartHour = config.initialDelayHours;

      for (let i = 0; i < config.phases.length; i++) {
        if (hoursInRamp < phaseStartHour + config.phases[i].periodHours) {
          currentPhaseIndex = i;
          break;
        }
        phaseStartHour += config.phases[i].periodHours;
      }

      return config.phases[currentPhaseIndex];
    }

    return null; // Ramp-up completed
  }

  // Check if group can post during ramp-up
  static canGroupPostDuringRampUp(
    groupState: GroupState,
    config: EnhancedSchedulingConfig
  ): {
    canPost: boolean;
    reason?: string;
    waitTimeMinutes?: number;
    currentPhase?: RampUpPhase;
  } {
    if (!this.isGroupInRampUp(groupState)) {
      return { canPost: true };
    }

    const rampConfig = this.getRampUpConfigFromSettings(config);
    const currentPhase = this.getCurrentRampUpPhase(groupState, rampConfig);

    if (!currentPhase) {
      return { canPost: true };
    }

    // Check if group has exceeded phase limits
    const phaseStart = this.getPhaseStartTime(groupState, currentPhase, rampConfig);
    const postsInPhase = this.getPostsInPhase(groupState, phaseStart);

    if (postsInPhase >= currentPhase.maxPostsPerPeriod) {
      const nextPhaseStart = this.getNextPhaseStartTime(groupState, currentPhase, rampConfig);
      const waitTimeMinutes = nextPhaseStart
        ? Math.ceil((nextPhaseStart.getTime() - new Date().getTime()) / (60 * 1000))
        : 0;

      return {
        canPost: false,
        reason: `Phase limit reached: ${postsInPhase}/${currentPhase.maxPostsPerPeriod} posts in ${currentPhase.name}`,
        waitTimeMinutes,
        currentPhase,
      };
    }

    // Check minimum interval for this phase
    if (groupState.last_post_times.length > 0) {
      const hoursSinceLastPost = (new Date().getTime() - groupState.last_post_times[0].getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastPost < currentPhase.minIntervalHours) {
        const waitTimeMinutes = Math.ceil((currentPhase.minIntervalHours - hoursSinceLastPost) * 60);

        return {
          canPost: false,
          reason: `Minimum interval not met for ${currentPhase.name} phase`,
          waitTimeMinutes,
          currentPhase,
        };
      }
    }

    return {
      canPost: true,
      currentPhase,
    };
  }

  // Get ramp-up configuration from settings
  private static getRampUpConfigFromSettings(config: EnhancedSchedulingConfig): RampUpConfig {
    return {
      week1MaxPosts: config.ramp_week1_max_posts || 1,
      week2MaxPosts: config.ramp_week2_max_posts || 1,
      initialDelayHours: config.initial_ramp_delay_hours || 48,
      phases: [
        {
          name: 'Week 1',
          maxPostsPerPeriod: config.ramp_week1_max_posts || 1,
          periodHours: 168, // 1 week
          minIntervalHours: 48,
          description: 'Week 1: Maximum 1 post with 48+ hour spacing',
        },
        {
          name: 'Week 2',
          maxPostsPerPeriod: config.ramp_week2_max_posts || 1,
          periodHours: 168, // 1 week
          minIntervalHours: 48,
          description: 'Week 2: Maximum 1 post per 48-72 hours',
        },
      ],
    };
  }

  // Get phase start time
  private static getPhaseStartTime(
    groupState: GroupState,
    phase: RampUpPhase,
    rampConfig: RampUpConfig
  ): Date {
    const rampStart = groupState.created_at;
    let phaseStartHour = rampConfig.initialDelayHours;

    for (const p of rampConfig.phases) {
      if (p.name === phase.name) {
        break;
      }
      phaseStartHour += p.periodHours;
    }

    return new Date(rampStart.getTime() + (phaseStartHour * 60 * 60 * 1000));
  }

  // Get next phase start time
  private static getNextPhaseStartTime(
    groupState: GroupState,
    currentPhase: RampUpPhase,
    rampConfig: RampUpConfig
  ): Date | null {
    const rampStart = groupState.created_at;
    let nextPhaseStartHour = rampConfig.initialDelayHours;

    let foundCurrent = false;
    for (const phase of rampConfig.phases) {
      if (foundCurrent) {
        return new Date(rampStart.getTime() + (nextPhaseStartHour * 60 * 60 * 1000));
      }

      if (phase.name === currentPhase.name) {
        foundCurrent = true;
      }
      nextPhaseStartHour += phase.periodHours;
    }

    return null; // No next phase
  }

  // Get posts in current phase
  private static getPostsInPhase(groupState: GroupState, phaseStart: Date): number {
    return groupState.last_post_times.filter(time => time >= phaseStart).length;
  }

  // Complete ramp-up for group (mark as graduated)
  static async completeRampUp(fbGroupId: string): Promise<void> {
    try {
      const state = await GroupStateService.getGroupState(fbGroupId);
      if (!state) return;

      // Remove ramp-up end date to mark as completed
      // The group will now use normal scheduling rules
      console.log(`Group ${fbGroupId} has completed ramp-up period`);
    } catch (error) {
      console.error('Error completing ramp-up:', error);
    }
  }

  // Get ramp-up statistics for dashboard
  static async getRampUpStats(): Promise<{
    totalGroupsInRampUp: number;
    groupsByPhase: Record<string, number>;
    recentlyGraduated: number;
  }> {
    try {
      // This would typically query all group states
      // For now, return a placeholder structure
      return {
        totalGroupsInRampUp: 0,
        groupsByPhase: {},
        recentlyGraduated: 0,
      };
    } catch (error) {
      console.error('Error getting ramp-up stats:', error);
      return {
        totalGroupsInRampUp: 0,
        groupsByPhase: {},
        recentlyGraduated: 0,
      };
    }
  }

  // Generate ramp-up insertion tasks for newly imported groups
  static async generateRampUpTasks(
    newGroupIds: string[],
    config: EnhancedSchedulingConfig
  ): Promise<{
    tasks: Array<{
      groupId: string;
      suggestedTime: Date;
      phase: string;
      reason: string;
    }>;
    warnings: string[];
  }> {
    const tasks: Array<{
      groupId: string;
      suggestedTime: Date;
      phase: string;
      reason: string;
    }> = [];
    const warnings: string[] = [];

    for (const groupId of newGroupIds) {
      try {
        const groupState = await GroupStateService.getGroupState(groupId);
        if (!groupState) continue;

        const rampUpCheck = this.canGroupPostDuringRampUp(groupState, config);

        if (rampUpCheck.canPost && rampUpCheck.currentPhase) {
          // Suggest a time for the next post in ramp-up
          const suggestedTime = new Date(Date.now() + (rampUpCheck.currentPhase.minIntervalHours * 60 * 60 * 1000));

          tasks.push({
            groupId,
            suggestedTime,
            phase: rampUpCheck.currentPhase.name,
            reason: rampUpCheck.currentPhase.description,
          });
        }
      } catch (error) {
        warnings.push(`Error generating ramp-up task for group ${groupId}: ${error}`);
      }
    }

    return { tasks, warnings };
  }
}