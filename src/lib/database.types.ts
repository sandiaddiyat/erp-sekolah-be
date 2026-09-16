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
        Row: { id: string; nama_jenjang: string; created_at: string };
        Insert: { id?: string; nama_jenjang: string; created_at?: string };
        Update: { id?: string; nama_jenjang?: string; created_at?: string };
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
          jurusan_id: string | null;
          jenis_sertifikasi_id: string | null;
          tahun_masuk: string | null;
          alamat: string | null;
          phone: string | null;
          email: string | null;
          bank_id: string | null;
          no_rekening: string | null;
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
          jurusan_id?: string | null;
          jenis_sertifikasi_id?: string | null;
          tahun_masuk?: string | null;
          alamat?: string | null;
          phone?: string | null;
          email?: string | null;
          bank_id?: string | null;
          no_rekening?: string | null;
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
          jurusan_id?: string | null;
          jenis_sertifikasi_id?: string | null;
          tahun_masuk?: string | null;
          alamat?: string | null;
          phone?: string | null;
          email?: string | null;
          bank_id?: string | null;
          no_rekening?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          status: string;
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
          status?: string;
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
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
