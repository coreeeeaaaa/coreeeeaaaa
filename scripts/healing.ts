import * as fs from 'fs/promises';
import * as path from 'path';

export async function generateRepairTicket(gateId: string, failureReason: string): Promise<void> {
  const ticketsDir = path.join(process.cwd(), 'tickets');
  await fs.mkdir(ticketsDir, { recursive: true });

  const ticketContent = `# Repair Ticket for Gate ${gateId}

## Failure Reason
${failureReason}

## Auto-Generated Actions
- [ ] Investigate root cause
- [ ] Implement fix
- [ ] Re-run gate
- [ ] Update documentation

## Timestamp
${new Date().toISOString()}
`;

  const ticketPath = path.join(ticketsDir, `repair-${gateId}-${Date.now()}.md`);
  await fs.writeFile(ticketPath, ticketContent);
  console.log(`Repair ticket generated: ${ticketPath}`);
}

// Usage: If gate fails, call generateRepairTicket('G0', 'Infrastructure unhealthy');