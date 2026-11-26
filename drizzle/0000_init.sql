CREATE TYPE "public"."asnaf" AS ENUM('fakir', 'miskin', 'amil', 'mualaf', 'riqab', 'gharim', 'fisabilillah', 'ibnu_sabil');--> statement-breakpoint
CREATE TYPE "public"."key_recipient" AS ENUM('unit', 'user');--> statement-breakpoint
CREATE TYPE "public"."mustahik_status" AS ENUM('diajukan', 'terverifikasi', 'ditolak');--> statement-breakpoint
CREATE TYPE "public"."program" AS ENUM('zakat_mal', 'zakat_fitrah', 'infak', 'sedekah', 'wakaf');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('donatur', 'mustahik', 'amil', 'auditor', 'admin');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"subject_user_id" uuid,
	"purpose" text,
	"prev_hash" text NOT NULL,
	"hash" text NOT NULL,
	CONSTRAINT "audit_log_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_id" uuid,
	"program" "program" NOT NULL,
	"amount" bigint NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mustahik" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"unit_id" uuid NOT NULL,
	"user_id" uuid,
	"asnaf" "asnaf" NOT NULL,
	"district" text NOT NULL,
	"status" "mustahik_status" DEFAULT 'diajukan' NOT NULL,
	"ciphertext" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mustahik_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "mustahik_keys" (
	"mustahik_id" uuid NOT NULL,
	"recipient_type" "key_recipient" NOT NULL,
	"recipient_id" uuid NOT NULL,
	"sealed_key" jsonb NOT NULL,
	CONSTRAINT "mustahik_keys_mustahik_id_recipient_type_recipient_id_pk" PRIMARY KEY("mustahik_id","recipient_type","recipient_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_members" (
	"unit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"sealed_unit_key" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unit_members_unit_id_user_id_pk" PRIMARY KEY("unit_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"public_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "role" DEFAULT 'donatur' NOT NULL,
	"auth_hash" text NOT NULL,
	"kdf_salt" text NOT NULL,
	"kdf_iterations" integer NOT NULL,
	"public_key" text NOT NULL,
	"wrapped_private_key" jsonb NOT NULL,
	"recovery_wrapped_private_key" jsonb NOT NULL,
	"consent_version" text NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_donor_id_users_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mustahik" ADD CONSTRAINT "mustahik_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mustahik" ADD CONSTRAINT "mustahik_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mustahik" ADD CONSTRAINT "mustahik_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mustahik_keys" ADD CONSTRAINT "mustahik_keys_mustahik_id_mustahik_id_fk" FOREIGN KEY ("mustahik_id") REFERENCES "public"."mustahik"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_members" ADD CONSTRAINT "unit_members_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_members" ADD CONSTRAINT "unit_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_subject_idx" ON "audit_log" USING btree ("subject_user_id");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "donations_donor_idx" ON "donations" USING btree ("donor_id");--> statement-breakpoint
CREATE INDEX "mustahik_unit_idx" ON "mustahik" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "mustahik_user_idx" ON "mustahik" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mustahik_keys_recipient_idx" ON "mustahik_keys" USING btree ("recipient_id");