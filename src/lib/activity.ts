import { db } from "@/lib/db";

/**
 * Waktu aktivitas terakhir di proyek (log, termin, retensi, dll) untuk indikator "belum dibaca".
 */
export async function getLastActivityAt(projectId: string): Promise<Date | null> {
  const [
    lastLog,
    lastRetensiLog,
    lastTermin,
    lastAdditionalWork,
    lastChangeRequest,
  ] = await Promise.all([
    db.log.findFirst({
      where: {
        OR: [
          { projectId },
          { milestone: { projectId } },
        ],
      },
      orderBy: { tanggal: "desc" },
      select: { tanggal: true },
    }),
    db.retensiLog.findFirst({
      where: { retensi: { projectId } },
      orderBy: { tanggal: "desc" },
      select: { tanggal: true },
    }),
    db.terminClient.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.additionalWork.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.changeRequest.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const dates: Date[] = [];
  if (lastLog?.tanggal) dates.push(lastLog.tanggal);
  if (lastRetensiLog?.tanggal) dates.push(lastRetensiLog.tanggal);
  if (lastTermin?.createdAt) dates.push(lastTermin.createdAt);
  if (lastAdditionalWork?.createdAt) dates.push(lastAdditionalWork.createdAt);
  if (lastChangeRequest?.createdAt) dates.push(lastChangeRequest.createdAt);

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

/** Tab Informasi & Pembayaran: termin (createdAt termins). */
export async function getLastActivityAtInfo(projectId: string): Promise<Date | null> {
  const lastTermin = await db.terminClient.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return lastTermin?.createdAt ?? null;
}

/** Tab Pekerjaan & Retensi: log progress, retensi, pekerjaan tambahan, pengurangan. */
export async function getLastActivityAtWork(projectId: string): Promise<Date | null> {
  const [lastLog, lastRetensiLog, lastAdditionalWork, lastChangeRequest] = await Promise.all([
    db.log.findFirst({
      where: {
        OR: [{ projectId }, { milestone: { projectId } }],
      },
      orderBy: { tanggal: "desc" },
      select: { tanggal: true },
    }),
    db.retensiLog.findFirst({
      where: { retensi: { projectId } },
      orderBy: { tanggal: "desc" },
      select: { tanggal: true },
    }),
    db.additionalWork.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.changeRequest.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const dates: Date[] = [];
  if (lastLog?.tanggal) dates.push(lastLog.tanggal);
  if (lastRetensiLog?.tanggal) dates.push(lastRetensiLog.tanggal);
  if (lastAdditionalWork?.createdAt) dates.push(lastAdditionalWork.createdAt);
  if (lastChangeRequest?.createdAt) dates.push(lastChangeRequest.createdAt);

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}
