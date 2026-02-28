import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "กรุณากรอกชื่อผู้ใช้หรือเลขบัตรประชาชน"),
  password: z.string().optional(),
});

export const studentSchema = z.object({
  nationalId: z.string().length(13, "เลขบัตรประชาชนต้องมี 13 หลัก").regex(/^\d+$/, "ต้องเป็นตัวเลขเท่านั้น"),
  examId: z.string().optional(),
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  dateOfBirth: z.string().optional(),
  school: z.string().optional(),
  province: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
});

export const adminSchema = z.object({
  username: z.string().min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  fullName: z.string().min(1, "กรุณากรอกชื่อ-นามสกุล"),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]),
});

export const documentSchema = z.object({
  type: z.enum(["INTENT_CONFIRM", "FEE_PAYMENT", "ENROLLMENT_CONFIRM", "ENROLLMENT_CONTRACT", "SCHOOL_TRANSFER"]),
  fileUrl: z.string().url("กรุณากรอก URL ที่ถูกต้อง"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type StudentInput = z.infer<typeof studentSchema>;
export type AdminInput = z.infer<typeof adminSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
