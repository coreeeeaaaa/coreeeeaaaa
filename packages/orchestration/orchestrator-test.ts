import { LifecycleOrchestrator } from './lifecycle-orchestrator';

async function runOrchestratorTest() {
  console.log('🧪 Starting Lifecycle Orchestrator Test...\n');

  // 생명체 오케스트레이터 생성
  const orchestrator = new LifecycleOrchestrator();

  // 테스트용 팀 구성
  const teamMembers = [
    {
      name: 'Data Processor',
      role: 'processor' as const,
      capabilities: ['development', 'analysis', 'testing']
    },
    {
      name: 'Quality Validator',
      role: 'validator' as const,
      capabilities: ['validation', 'testing', 'analysis']
    },
    {
      name: 'System Coordinator',
      role: 'coordinator' as const,
      capabilities: ['development', 'validation', 'analysis']
    },
    {
      name: 'Pipeline Manager',
      role: 'processor' as const,
      capabilities: ['development', 'testing']
    },
    {
      name: 'Circuit Validator',
      role: 'validator' as const,
      capabilities: ['validation', 'analysis']
    }
  ];

  // 테스트용 워크플로우 구성 (순환/파이프라인 구조)
  const workflows = [
    {
      name: 'Data Processing Pipeline',
      tasks: [
        {
          type: 'analysis' as const,
          priority: 'high' as const,
          data: { input: 'raw_data', stage: 'extraction' },
          dependencies: [],
          maxAttempts: 3
        },
        {
          type: 'development' as const,
          priority: 'high' as const,
          data: { input: 'extracted_data', stage: 'transformation' },
          dependencies: [], // 첫 작업과 병렬 실행 가능
          maxAttempts: 3
        },
        {
          type: 'validation' as const,
          priority: 'medium' as const,
          data: { input: 'transformed_data', stage: 'validation' },
          dependencies: [], // 첫 작업에만 의존
          maxAttempts: 3
        },
        {
          type: 'testing' as const,
          priority: 'medium' as const,
          data: { input: 'validated_data', stage: 'testing' },
          dependencies: [],
          maxAttempts: 3
        },
        {
          type: 'analysis' as const,
          priority: 'low' as const,
          data: { input: 'test_results', stage: 'final_analysis' },
          dependencies: [],
          maxAttempts: 3
        }
      ]
    },
    {
      name: 'Circular Processing Loop',
      tasks: [
        {
          type: 'development' as const,
          priority: 'critical' as const,
          data: { iteration: 1, data: 'initial' },
          dependencies: [],
          maxAttempts: 5
        },
        {
          type: 'validation' as const,
          priority: 'high' as const,
          data: { iteration: 1, validation: 'first_pass' },
          dependencies: [],
          maxAttempts: 3
        },
        {
          type: 'development' as const,
          priority: 'high' as const,
          data: { iteration: 2, enhancement: 'based_on_validation' },
          dependencies: [],
          maxAttempts: 3
        },
        {
          type: 'analysis' as const,
          priority: 'critical' as const,
          data: { iteration: 2, analysis: 'comprehensive_review' },
          dependencies: [],
          maxAttempts: 3
        }
      ]
    },
    {
      name: 'Adaptive Learning Workflow',
      tasks: [
        {
          type: 'analysis' as const,
          priority: 'medium' as const,
          data: { learning_phase: 'data_collection' },
          dependencies: [],
          maxAttempts: 3
        },
        {
          type: 'development' as const,
          priority: 'medium' as const,
          data: { learning_phase: 'pattern_detection' },
          dependencies: [],
          maxAttempts: 3
        },
        {
          type: 'validation' as const,
          priority: 'high' as const,
          data: { learning_phase: 'model_validation' },
          dependencies: [],
          maxAttempts: 3
        }
      ]
    }
  ];

  // 이벤트 리스너 설정
  orchestrator.on('born', (data) => {
    console.log('🎉 System born successfully!');
    console.log(`   State: ${data.state}`);
    console.log(`   Initial Health: ${data.metrics.health}`);
    console.log(`   Initial Vitality: ${data.metrics.vitality}\n`);
  });

  orchestrator.on('heartbeat', (data) => {
    const { state, metrics, environment } = data;

    if (metrics.age % 10000 < 2000) { // 10초마다 출력
      console.log('💓 Heartbeat:', {
        state,
        health: metrics.health.toFixed(1),
        vitality: metrics.vitality.toFixed(1),
        growth: metrics.growth.toFixed(1),
        experience: metrics.experience,
        environment: {
          load: environment.load.toFixed(1),
          stress: environment.stress.toFixed(1),
          resources: environment.resources
        }
      });
    }
  });

  orchestrator.on('state_changed', (data) => {
    console.log('🔄 State changed:', {
      state: data.state,
      health: data.health,
      stress: data.environment.stress.toFixed(1)
    });
  });

  orchestrator.on('lifecycle_task_completed', (data) => {
    console.log('✅ Task completed:', data.task.id);
  });

  orchestrator.on('lifecycle_task_failed', (data) => {
    console.log('❌ Task failed:', data.task.id, '-', data.error.message);
  });

  orchestrator.on('lifecycle_workflow_completed', (data) => {
    console.log('🏁 Workflow completed:', data.workflow.name);
  });

  orchestrator.on('workflow_paused', (data) => {
    console.log('⏸️ Workflow paused:', data.reason);
  });

  orchestrator.on('waiting', (data) => {
    console.log('⏳ System waiting:', data.reason);
  });

  orchestrator.on('evolved', (data) => {
    console.log('🧬 System evolved!', {
      wisdom: data.metrics.wisdom.toFixed(1),
      patterns: data.patterns,
      behaviors: data.behaviors
    });
  });

  orchestrator.on('hibernating', (data) => {
    console.log('🛌 Entering hibernation mode');
  });

  orchestrator.on('awakening', (data) => {
    console.log('😊 Awakening from hibernation');
  });

  try {
    // 시스템 탄생
    console.log('🌱 Giving birth to the lifecycle orchestrator...\n');
    await orchestrator.birth({
      teamMembers,
      initialWorkflows: workflows
    });

    // 잠시 관찰
    console.log('🔍 Observing system behavior for 30 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // 상태 확인
    const currentState = orchestrator.getState();
    console.log('\n📊 Current System Status:');
    console.log(`   State: ${currentState}`);
    console.log(`   Health: ${currentState.metrics.health.toFixed(1)}/100`);
    console.log(`   Growth: ${currentState.metrics.growth.toFixed(1)}/100`);
    console.log(`   Adaptation: ${currentState.metrics.adaptation.toFixed(1)}/100`);
    console.log(`   Resilience: ${currentState.metrics.resilience.toFixed(1)}/100`);
    console.log(`   Efficiency: ${currentState.metrics.efficiency.toFixed(1)}/100`);
    console.log(`   Vitality: ${currentState.metrics.vitality.toFixed(1)}/100`);
    console.log(`   Experience: ${currentState.metrics.experience}`);
    console.log(`   Wisdom: ${currentState.metrics.wisdom.toFixed(1)}/100`);

    // 경험 및 패턴 확인
    const experience = orchestrator.getExperience();
    const patterns = orchestrator.getPatterns();
    console.log(`\n🧠 Learned Behaviors: ${experience.size}`);
    console.log(`🎯 Recognized Patterns: ${patterns.size}`);

    // 건강 검진
    const healthCheck = await orchestrator.performHealthCheck();
    console.log(`\n🏥 Health Check Result:`);
    console.log(`   Healthy: ${healthCheck.healthy ? '✅' : '❌'}`);
    if (healthCheck.issues.length > 0) {
      console.log(`   Issues: ${healthCheck.issues.join(', ')}`);
    }
    if (healthCheck.recommendations.length > 0) {
      console.log(`   Recommendations: ${healthCheck.recommendations.join(', ')}`);
    }

    // 추가 관찰 (진화 확인)
    console.log('\n🔬 Observing for potential evolution...');
    await new Promise(resolve => setTimeout(resolve, 20000));

    // 최종 상태 확인
    const finalState = orchestrator.getState();
    console.log('\n🏁 Final System Status:');
    console.log(`   Total Age: ${(finalState.metrics.age / 1000).toFixed(1)}s`);
    console.log(`   Final Health: ${finalState.metrics.health.toFixed(1)}/100`);
    console.log(`   Total Experience: ${finalState.metrics.experience}`);
    console.log(`   Final Wisdom: ${finalState.metrics.wisdom.toFixed(1)}/100`);

    // 시스템 종료
    console.log('\n💀 System lifecycle complete - shutting down...');
    await orchestrator.die('Test completed successfully');

    console.log('\n✅ Lifecycle Orchestrator Test Completed Successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await orchestrator.die('Test failed with error');
  }
}

// 테스트 실행
if (require.main === module) {
  runOrchestratorTest().catch(console.error);
}

export { runOrchestratorTest };