export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SchoolStatus = "trial" | "active" | "suspended";

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          slug: string;
          npsn: string | null;
          level: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          status: SchoolStatus;
          active_until: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          npsn?: string | null;
          level?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          status?: SchoolStatus;
          active_until?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          npsn?: string | null;
          level?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          status?: SchoolStatus;
          active_until?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          school_id: string | null;
          full_name: string;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          jabatan: string | null;
          is_active: boolean;
          is_super_admin: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          school_id?: string | null;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          jabatan?: string | null;
          is_active?: boolean;
          is_super_admin?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string | null;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          jabatan?: string | null;
          is_active?: boolean;
          is_super_admin?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          id: string;
          school_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roles_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          id: string;
          module: string;
          action: string;
          slug: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          module: string;
          action: string;
          slug: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          module?: string;
          action?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      school_notes: {
        Row: {
          id: string;
          school_id: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          note: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          note?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "school_notes_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          user_id: string;
          role_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      wilayah: {
        Row: {
          id: string;
          kode_wilayah: string;
          nama_wilayah: string;
          level: string;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          kode_wilayah: string;
          nama_wilayah: string;
          level: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          kode_wilayah?: string;
          nama_wilayah?: string;
          level?: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      agama: {
        Row: { id: string; nama_agama: string; created_at: string };
        Insert: { id?: string; nama_agama: string; created_at?: string };
        Update: { id?: string; nama_agama?: string; created_at?: string };
        Relationships: [];
      };
      bank: {
        Row: { id: string; nama_bank: string; kode_bank: string | null; created_at: string };
        Insert: { id?: string; nama_bank: string; kode_bank?: string | null; created_at?: string };
        Update: { id?: string; nama_bank?: string; kode_bank?: string | null; created_at?: string };
        Relationships: [];
      };
      jenis_dokumen: {
        Row: { id: string; nama_dokumen: string; wajib_unggah: boolean; created_at: string };
        Insert: { id?: string; nama_dokumen: string; wajib_unggah?: boolean; created_at?: string };
        Update: { id?: string; nama_dokumen?: string; wajib_unggah?: boolean; created_at?: string };
        Relationships: [];
      };
      jenjang_pendidikan: {
        Row: { id: string; nama_jenjang: string; urutan: number; created_at: string };
        Insert: { id?: string; nama_jenjang: string; urutan?: number; created_at?: string };
        Update: { id?: string; nama_jenjang?: string; urutan?: number; created_at?: string };
        Relationships: [];
      };
      status_kepegawaian: {
        Row: { id: string; school_id: string; nama_status: string; created_at: string };
        Insert: { id?: string; school_id: string; nama_status: string; created_at?: string };
        Update: { id?: string; school_id?: string; nama_status?: string; created_at?: string };
        Relationships: [];
      };
      jabatan: {
        Row: {
          id: string;
          school_id: string;
          nama_jabatan: string;
          kategori: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          nama_jabatan: string;
          kategori?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          nama_jabatan?: string;
          kategori?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      golongan: {
        Row: {
          id: string;
          school_id: string;
          kode_golongan: string;
          keterangan: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          kode_golongan: string;
          keterangan?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          kode_golongan?: string;
          keterangan?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      unit_kerja: {
        Row: {
          id: string;
          school_id: string;
          nama_unit: string;
          parent_unit_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          nama_unit: string;
          parent_unit_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          nama_unit?: string;
          parent_unit_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      mapel: {
        Row: {
          id: string;
          school_id: string;
          nama_mapel: string;
          kode_mapel: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          nama_mapel: string;
          kode_mapel: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          nama_mapel?: string;
          kode_mapel?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      jurusan: {
        Row: {
          id: string;
          school_id: string | null;
          nama_jurusan: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id?: string | null;
          nama_jurusan: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string | null;
          nama_jurusan?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      jenis_sertifikasi: {
        Row: { id: string; school_id: string; nama_sertifikasi: string; created_at: string };
        Insert: { id?: string; school_id: string; nama_sertifikasi: string; created_at?: string };
        Update: { id?: string; school_id?: string; nama_sertifikasi?: string; created_at?: string };
        Relationships: [];
      };
      jenis_cuti_izin: {
        Row: {
          id: string;
          school_id: string;
          nama_jenis: string;
          kuota_hari: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          nama_jenis: string;
          kuota_hari?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          nama_jenis?: string;
          kuota_hari?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tahun_ajaran: {
        Row: {
          id: string;
          school_id: string;
          nama_tahun_ajaran: string;
          semester: string;
          tanggal_mulai: string | null;
          tanggal_selesai: string | null;
          status_aktif: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          nama_tahun_ajaran: string;
          semester: string;
          tanggal_mulai?: string | null;
          tanggal_selesai?: string | null;
          status_aktif?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          nama_tahun_ajaran?: string;
          semester?: string;
          tanggal_mulai?: string | null;
          tanggal_selesai?: string | null;
          status_aktif?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      pegawai: {
        Row: {
          id: string;
          school_id: string;
          user_id: string | null;
          nip: string | null;
          niy: string | null;
          nuptk: string | null;
          full_name: string;
          jenis_kelamin: string | null;
          tempat_lahir: string | null;
          tanggal_lahir: string | null;
          agama_id: string | null;
          status_kepegawaian_id: string | null;
          jabatan_id: string | null;
          golongan_id: string | null;
          unit_kerja_id: string | null;
          pendidikan_terakhir_id: string | null;
          tahun_masuk: string | null;
          alamat: string | null;
          phone: string | null;
          email: string | null;
          photo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          user_id?: string | null;
          nip?: string | null;
          niy?: string | null;
          nuptk?: string | null;
          full_name: string;
          jenis_kelamin?: string | null;
          tempat_lahir?: string | null;
          tanggal_lahir?: string | null;
          agama_id?: string | null;
          status_kepegawaian_id?: string | null;
          jabatan_id?: string | null;
          golongan_id?: string | null;
          unit_kerja_id?: string | null;
          pendidikan_terakhir_id?: string | null;
          tahun_masuk?: string | null;
          alamat?: string | null;
          phone?: string | null;
          email?: string | null;
          photo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          user_id?: string | null;
          nip?: string | null;
          niy?: string | null;
          nuptk?: string | null;
          full_name?: string;
          jenis_kelamin?: string | null;
          tempat_lahir?: string | null;
          tanggal_lahir?: string | null;
          agama_id?: string | null;
          status_kepegawaian_id?: string | null;
          jabatan_id?: string | null;
          golongan_id?: string | null;
          unit_kerja_id?: string | null;
          pendidikan_terakhir_id?: string | null;
          tahun_masuk?: string | null;
          alamat?: string | null;
          phone?: string | null;
          email?: string | null;
          photo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pegawai_jabatan: {
        Row: {
          id: string;
          school_id: string;
          pegawai_id: string;
          jabatan_id: string;
          is_utama: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          pegawai_id: string;
          jabatan_id: string;
          is_utama?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          pegawai_id?: string;
          jabatan_id?: string;
          is_utama?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pegawai_jabatan_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pegawai_jabatan_pegawai_id_fkey";
            columns: ["pegawai_id"];
            isOneToOne: false;
            referencedRelation: "pegawai";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pegawai_jabatan_jabatan_id_fkey";
            columns: ["jabatan_id"];
            isOneToOne: false;
            referencedRelation: "jabatan";
            referencedColumns: ["id"];
          },
        ];
      };
      pegawai_pendidikan: {
        Row: {
          id: string;
          school_id: string;
          pegawai_id: string;
          jenjang_pendidikan_id: string | null;
          jurusan: string | null;
          nama_institusi: string | null;
          tahun_lulus: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          pegawai_id: string;
          jenjang_pendidikan_id?: string | null;
          jurusan?: string | null;
          nama_institusi?: string | null;
          tahun_lulus?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          pegawai_id?: string;
          jenjang_pendidikan_id?: string | null;
          jurusan?: string | null;
          nama_institusi?: string | null;
          tahun_lulus?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pegawai_pendidikan_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pegawai_pendidikan_pegawai_id_fkey";
            columns: ["pegawai_id"];
            isOneToOne: false;
            referencedRelation: "pegawai";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pegawai_pendidikan_jenjang_pendidikan_id_fkey";
            columns: ["jenjang_pendidikan_id"];
            isOneToOne: false;
            referencedRelation: "jenjang_pendidikan";
            referencedColumns: ["id"];
          },
        ];
      };
      pegawai_sertifikasi: {
        Row: {
          id: string;
          school_id: string;
          pegawai_id: string;
          nama_sertifikasi: string;
          tanggal_berlaku: string | null;
          tanggal_kedaluwarsa: string | null;
          nomor_sertifikat: string | null;
          penerbit: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          pegawai_id: string;
          nama_sertifikasi: string;
          tanggal_berlaku?: string | null;
          tanggal_kedaluwarsa?: string | null;
          nomor_sertifikat?: string | null;
          penerbit?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          pegawai_id?: string;
          nama_sertifikasi?: string;
          tanggal_berlaku?: string | null;
          tanggal_kedaluwarsa?: string | null;
          nomor_sertifikat?: string | null;
          penerbit?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pegawai_sertifikasi_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pegawai_sertifikasi_pegawai_id_fkey";
            columns: ["pegawai_id"];
            isOneToOne: false;
            referencedRelation: "pegawai";
            referencedColumns: ["id"];
          },
        ];
      };
      students: {
        Row: {
          id: string;
          school_id: string;
          user_id: string | null;
          nis: string | null;
          nisn: string | null;
          nama_lengkap: string;
          jenis_kelamin: string | null;
          tempat_lahir: string | null;
          tanggal_lahir: string | null;
          agama_id: string | null;
          alamat: string | null;
          nama_ayah: string | null;
          nama_ibu: string | null;
          nama_wali: string | null;
          telepon_wali: string | null;
          photo_url: string | null;
          status: string;
          family_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          user_id?: string | null;
          nis?: string | null;
          nisn?: string | null;
          nama_lengkap: string;
          jenis_kelamin?: string | null;
          tempat_lahir?: string | null;
          tanggal_lahir?: string | null;
          agama_id?: string | null;
          alamat?: string | null;
          nama_ayah?: string | null;
          nama_ibu?: string | null;
          nama_wali?: string | null;
          telepon_wali?: string | null;
          photo_url?: string | null;
          status?: string;
          family_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          user_id?: string | null;
          nis?: string | null;
          nisn?: string | null;
          nama_lengkap?: string;
          jenis_kelamin?: string | null;
          tempat_lahir?: string | null;
          tanggal_lahir?: string | null;
          agama_id?: string | null;
          alamat?: string | null;
          nama_ayah?: string | null;
          nama_ibu?: string | null;
          nama_wali?: string | null;
          telepon_wali?: string | null;
          photo_url?: string | null;
          status?: string;
          family_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bill_items: {
        Row: {
          id: string;
          school_id: string;
          nama_item: string;
          nominal: number;
          frekuensi: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          nama_item: string;
          nominal: number;
          frekuensi?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          nama_item?: string;
          nominal?: number;
          frekuensi?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      bills: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          bill_item_id: string | null;
          deskripsi: string;
          nominal: number;
          diskon: number;
          diskon_keterangan: string | null;
          jatuh_tempo: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          bill_item_id?: string | null;
          deskripsi: string;
          nominal: number;
          diskon?: number;
          diskon_keterangan?: string | null;
          jatuh_tempo?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          bill_item_id?: string | null;
          deskripsi?: string;
          nominal?: number;
          diskon?: number;
          diskon_keterangan?: string | null;
          jatuh_tempo?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bills_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bills_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bills_bill_item_id_fkey";
            columns: ["bill_item_id"];
            isOneToOne: false;
            referencedRelation: "bill_items";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          school_id: string;
          bill_id: string;
          dicatat_oleh: string;
          nominal: number;
          metode: string;
          bukti_url: string | null;
          catatan: string | null;
          status: string;
          diverifikasi_oleh: string | null;
          diverifikasi_pada: string | null;
          created_at: string;
          updated_at: string;
          invoice_id: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          bill_id: string;
          dicatat_oleh: string;
          nominal: number;
          metode: string;
          bukti_url?: string | null;
          catatan?: string | null;
          status?: string;
          diverifikasi_oleh?: string | null;
          diverifikasi_pada?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          bill_id?: string;
          dicatat_oleh?: string;
          nominal?: number;
          metode?: string;
          bukti_url?: string | null;
          catatan?: string | null;
          status?: string;
          diverifikasi_oleh?: string | null;
          diverifikasi_pada?: string | null;
          created_at?: string;
          updated_at?: string;
          invoice_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_bill_id_fkey";
            columns: ["bill_id"];
            isOneToOne: false;
            referencedRelation: "bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_dicatat_oleh_fkey";
            columns: ["dicatat_oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_diverifikasi_oleh_fkey";
            columns: ["diverifikasi_oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_years: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          start_date: string;
          end_date: string;
          status: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          start_date: string;
          end_date: string;
          status?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          status?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      education_levels: {
        Row: {
          id: string;
          school_id: string;
          code: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          code: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          code?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "education_levels_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      grades: {
        Row: {
          id: string;
          school_id: string;
          education_level_id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          education_level_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          education_level_id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grades_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grades_education_level_id_fkey";
            columns: ["education_level_id"];
            isOneToOne: false;
            referencedRelation: "education_levels";
            referencedColumns: ["id"];
          },
        ];
      };
      majors: {
        Row: {
          id: string;
          school_id: string;
          education_level_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          education_level_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          education_level_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "majors_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "majors_education_level_id_fkey";
            columns: ["education_level_id"];
            isOneToOne: false;
            referencedRelation: "education_levels";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          type: string | null;
          capacity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          type?: string | null;
          capacity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          type?: string | null;
          capacity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      classes: {
        Row: {
          id: string;
          school_id: string;
          academic_year_id: string;
          grade_id: string;
          major_id: string | null;
          room_id: string | null;
          homeroom_teacher_id: string | null;
          name: string;
          capacity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          academic_year_id: string;
          grade_id: string;
          major_id?: string | null;
          room_id?: string | null;
          homeroom_teacher_id?: string | null;
          name: string;
          capacity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          academic_year_id?: string;
          grade_id?: string;
          major_id?: string | null;
          room_id?: string | null;
          homeroom_teacher_id?: string | null;
          name?: string;
          capacity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_grade_id_fkey";
            columns: ["grade_id"];
            isOneToOne: false;
            referencedRelation: "grades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_major_id_fkey";
            columns: ["major_id"];
            isOneToOne: false;
            referencedRelation: "majors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_homeroom_teacher_id_fkey";
            columns: ["homeroom_teacher_id"];
            isOneToOne: false;
            referencedRelation: "pegawai";
            referencedColumns: ["id"];
          },
        ];
      };
      student_enrollments: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          academic_year_id: string;
          class_id: string;
          enrollment_date: string;
          exit_date: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          academic_year_id: string;
          class_id: string;
          enrollment_date: string;
          exit_date?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          academic_year_id?: string;
          class_id?: string;
          enrollment_date?: string;
          exit_date?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_enrollments_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      fee_categories: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          billing_cycle: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          billing_cycle: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          billing_cycle?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fee_categories_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      fee_structures: {
        Row: {
          id: string;
          school_id: string;
          academic_year_id: string;
          education_level_id: string;
          grade_id: string;
          major_id: string | null;
          fee_category_id: string;
          amount: number;
          due_day: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          academic_year_id: string;
          education_level_id: string;
          grade_id: string;
          major_id?: string | null;
          fee_category_id: string;
          amount: number;
          due_day?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          academic_year_id?: string;
          education_level_id?: string;
          grade_id?: string;
          major_id?: string | null;
          fee_category_id?: string;
          amount?: number;
          due_day?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fee_structures_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_structures_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_structures_education_level_id_fkey";
            columns: ["education_level_id"];
            isOneToOne: false;
            referencedRelation: "education_levels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_structures_grade_id_fkey";
            columns: ["grade_id"];
            isOneToOne: false;
            referencedRelation: "grades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_structures_major_id_fkey";
            columns: ["major_id"];
            isOneToOne: false;
            referencedRelation: "majors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_structures_fee_category_id_fkey";
            columns: ["fee_category_id"];
            isOneToOne: false;
            referencedRelation: "fee_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      families: {
        Row: {
          id: string;
          school_id: string;
          family_code: string | null;
          home_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          family_code?: string | null;
          home_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          family_code?: string | null;
          home_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "families_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      guardians: {
        Row: {
          id: string;
          school_id: string;
          family_id: string;
          name: string;
          relation: string;
          phone: string | null;
          email: string | null;
          is_primary_billing_contact: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          family_id: string;
          name: string;
          relation: string;
          phone?: string | null;
          email?: string | null;
          is_primary_billing_contact?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          family_id?: string;
          name?: string;
          relation?: string;
          phone?: string | null;
          email?: string | null;
          is_primary_billing_contact?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guardians_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guardians_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          guardian_id: string | null;
          academic_year_id: string;
          period_label: string;
          issue_date: string;
          due_date: string;
          total_amount: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          guardian_id?: string | null;
          academic_year_id: string;
          period_label: string;
          issue_date: string;
          due_date: string;
          total_amount?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          guardian_id?: string | null;
          academic_year_id?: string;
          period_label?: string;
          issue_date?: string;
          due_date?: string;
          total_amount?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_guardian_id_fkey";
            columns: ["guardian_id"];
            isOneToOne: false;
            referencedRelation: "guardians";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_details: {
        Row: {
          id: string;
          invoice_id: string;
          fee_structure_id: string;
          description: string;
          base_amount: number;
          discount_amount: number;
          final_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          fee_structure_id: string;
          description: string;
          base_amount?: number;
          discount_amount?: number;
          final_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          fee_structure_id?: string;
          description?: string;
          base_amount?: number;
          discount_amount?: number;
          final_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_details_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_details_fee_structure_id_fkey";
            columns: ["fee_structure_id"];
            isOneToOne: false;
            referencedRelation: "fee_structures";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_run_logs: {
        Row: {
          id: string;
          school_id: string;
          academic_year_id: string;
          period_label: string;
          run_at: string;
          total_invoices_generated: number;
          status: string;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          academic_year_id: string;
          period_label: string;
          run_at?: string;
          total_invoices_generated?: number;
          status: string;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          academic_year_id?: string;
          period_label?: string;
          run_at?: string;
          total_invoices_generated?: number;
          status?: string;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "billing_run_logs_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "billing_run_logs_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
        ];
      };
      discount_types: {
        Row: {
          id: string;
          school_id: string;
          code: string;
          name: string;
          calc_type: string;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          code: string;
          name: string;
          calc_type: string;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          code?: string;
          name?: string;
          calc_type?: string;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discount_types_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      student_discounts: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          discount_type_id: string;
          value: number;
          start_date: string;
          end_date: string;
          status: string;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          discount_type_id: string;
          value: number;
          start_date: string;
          end_date: string;
          status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          discount_type_id?: string;
          value?: number;
          start_date?: string;
          end_date?: string;
          status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_discounts_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_discounts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_discounts_discount_type_id_fkey";
            columns: ["discount_type_id"];
            isOneToOne: false;
            referencedRelation: "discount_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_discounts_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_methods: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          is_cash: boolean;
          is_gateway: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          is_cash?: boolean;
          is_gateway?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          is_cash?: boolean;
          is_gateway?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_methods_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      bank_accounts: {
        Row: {
          id: string;
          school_id: string;
          bank_name: string;
          account_number: string;
          account_holder: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          bank_name: string;
          account_number: string;
          account_holder: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          bank_name?: string;
          account_number?: string;
          account_holder?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bank_accounts_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_school_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      current_user_active: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      current_school_active: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      current_access_ok: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      create_school: {
        Args: {
          p_name: string;
          p_slug: string;
          p_npsn?: string | null;
          p_level?: string | null;
          p_address?: string | null;
          p_phone?: string | null;
          p_email?: string | null;
          p_status?: string;
          p_active_until?: string | null;
        };
        Returns: string;
      };
      get_current_user_context: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
    };
    Enums: {
      school_status: SchoolStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
