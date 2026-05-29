import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminService, UsuarioAdmin } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { RolDto, RolService } from '../../services/rol.service';
import { PermisoDef, PERMISO_MODULOS_ORDEN } from '../../config/permissions.config';
import { roleLabel } from '../../config/nav-permissions';
import { DialogService } from '../../services/dialog.service';

@Component({
  selector: 'app-roles-permisos-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles-permisos-panel.component.html',
  styleUrl: './roles-permisos-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RolesPermisosPanelComponent implements OnInit {

  usuarios: UsuarioAdmin[] = [];
  roles: RolDto[] = [];
  catalogoPermisos: PermisoDef[] = [];

  rolSeleccionado = '';
  permisosSeleccionados = new Set<string>();
  permisosOriginales = new Set<string>();

  filtroPermiso = '';
  filtroModulo = '';

  nuevoRolNombre = '';
  nuevoRolDescripcion = '';
  editandoRol: RolDto | null = null;
  editRolDescripcion = '';

  editandoUsuario: UsuarioAdmin | null = null;
  editUsuarioRol = '';

  guardandoPermisos = false;
  cargando = true;

  readonly modulosOrden = PERMISO_MODULOS_ORDEN;

  constructor(
    private admin: AdminService,
    private rolService: RolService,
    readonly auth: AuthService,
    private notify: NotificationService,
    private dialog: DialogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.recargarTodo();
  }

  get puedeGestionar(): boolean {
    return this.auth.canAdministrarRoles();
  }

  recargarTodo(): void {
    if (!this.puedeGestionar) {
      this.cargando = false;
      this.cdr.markForCheck();
      return;
    }
    this.cargando = true;
    this.admin.listarUsuarios().subscribe({
      next: (u) => {
        this.usuarios = u;
        this.cdr.markForCheck();
      },
      error: () => this.notify.error('No se pudieron cargar los usuarios')
    });
    this.rolService.listarRoles().subscribe({
      next: (r) => {
        this.roles = r;
        if (!this.rolSeleccionado && r.length) {
          this.seleccionarRol(r[0].nombre);
        }
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.notify.error('No se pudieron cargar los roles');
        this.cdr.markForCheck();
      }
    });
    this.rolService.listarPermisos().subscribe({
      next: (p) => {
        this.catalogoPermisos = p;
        this.cdr.markForCheck();
      }
    });
  }

  seleccionarRol(nombre: string): void {
    this.rolSeleccionado = nombre;
    this.rolService.permisosDeRol(nombre).subscribe({
      next: (codes) => {
        this.permisosSeleccionados = new Set(codes);
        this.permisosOriginales = new Set(codes);
        this.cdr.markForCheck();
      }
    });
  }

  permisosFiltrados(): PermisoDef[] {
    const q = this.filtroPermiso.trim().toLowerCase();
    const mod = this.filtroModulo.trim();
    return this.catalogoPermisos.filter((p) => {
      if (mod && p.modulo !== mod) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        p.codigo.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        p.modulo.toLowerCase().includes(q)
      );
    });
  }

  permisosPorModulo(modulo: string): PermisoDef[] {
    return this.permisosFiltrados().filter((p) => p.modulo === modulo);
  }

  modulosVisibles(): string[] {
    const mods = new Set(this.permisosFiltrados().map((p) => p.modulo));
    return this.modulosOrden.filter((m) => mods.has(m));
  }

  tienePermiso(codigo: string): boolean {
    return this.permisosSeleccionados.has(codigo);
  }

  togglePermiso(codigo: string, activo: boolean): void {
    if (activo) {
      this.permisosSeleccionados.add(codigo);
    } else {
      this.permisosSeleccionados.delete(codigo);
    }
    this.permisosSeleccionados = new Set(this.permisosSeleccionados);
    this.cdr.markForCheck();
  }

  guardarPermisosRol(): void {
    if (!this.rolSeleccionado || !this.auth.puede('ROLES_ASIGNAR_PERMISOS')) {
      this.notify.warning('No tiene permiso para asignar permisos.');
      return;
    }
    this.guardandoPermisos = true;
    const list = [...this.permisosSeleccionados];
    this.rolService.guardarPermisosRol(this.rolSeleccionado, list).subscribe({
      next: (saved) => {
        this.permisosSeleccionados = new Set(saved);
        this.permisosOriginales = new Set(saved);
        this.guardandoPermisos = false;
        this.notify.success('Permisos guardados en la base de datos.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.guardandoPermisos = false;
        this.notify.error(this.mensajeError(err));
        this.cdr.markForCheck();
      }
    });
  }

  restaurarPermisosDefecto(): void {
    if (!this.rolSeleccionado) {
      return;
    }
    void this.dialog.confirm({
      title: 'Restaurar permisos',
      message: `¿Restaurar los permisos por defecto del rol ${this.rolEtiqueta(this.rolSeleccionado)}?`,
      confirmText: 'Restaurar',
      variant: 'warning'
    }).then((ok) => {
      if (!ok) {
        return;
      }
      this.rolService.restaurarPermisosRol(this.rolSeleccionado).subscribe({
        next: (saved) => {
          this.permisosSeleccionados = new Set(saved);
          this.permisosOriginales = new Set(saved);
          this.notify.success('Permisos restaurados.');
          this.cdr.markForCheck();
        },
        error: (err) => this.notify.error(this.mensajeError(err))
      });
    });
  }

  crearRol(): void {
    const nombre = this.nuevoRolNombre.trim().toUpperCase();
    if (!nombre) {
      this.notify.warning('Indique el nombre del rol.');
      return;
    }
    this.rolService.crearRol({ nombre, descripcion: this.nuevoRolDescripcion }).subscribe({
      next: () => {
        this.nuevoRolNombre = '';
        this.nuevoRolDescripcion = '';
        this.notify.success('Rol creado.');
        this.recargarTodo();
      },
      error: (err) => this.notify.error(this.mensajeError(err))
    });
  }

  iniciarEditarRol(rol: RolDto): void {
    this.editandoRol = rol;
    this.editRolDescripcion = rol.descripcion ?? '';
    this.cdr.markForCheck();
  }

  guardarEditarRol(): void {
    if (!this.editandoRol) {
      return;
    }
    this.rolService.actualizarRol(this.editandoRol.nombre, {
      descripcion: this.editRolDescripcion
    }).subscribe({
      next: () => {
        this.editandoRol = null;
        this.notify.success('Rol actualizado.');
        this.recargarTodo();
      },
      error: (err) => this.notify.error(this.mensajeError(err))
    });
  }

  eliminarRol(rol: RolDto): void {
    if (rol.nombre === 'ADMIN') {
      return;
    }
    void this.dialog.confirm({
      title: 'Eliminar rol',
      message: `¿Eliminar el rol ${rol.nombre}? Solo es posible si no tiene usuarios.`,
      confirmText: 'Eliminar',
      variant: 'danger'
    }).then((ok) => {
      if (!ok) {
        return;
      }
      this.rolService.eliminarRol(rol.nombre).subscribe({
        next: () => {
          if (this.rolSeleccionado === rol.nombre) {
            this.rolSeleccionado = '';
          }
          this.notify.success('Rol eliminado.');
          this.recargarTodo();
        },
        error: (err) => this.notify.error(this.mensajeError(err))
      });
    });
  }

  desactivarRol(rol: RolDto): void {
    this.rolService.cambiarEstadoRol(rol.nombre, false).subscribe({
      next: () => {
        this.notify.success('Rol desactivado.');
        this.recargarTodo();
      },
      error: (err) => this.notify.error(this.mensajeError(err))
    });
  }

  activarRol(rol: RolDto): void {
    this.rolService.cambiarEstadoRol(rol.nombre, true).subscribe({
      next: () => {
        this.notify.success('Rol activado.');
        this.recargarTodo();
      },
      error: (err) => this.notify.error(this.mensajeError(err))
    });
  }

  abrirEditarUsuario(u: UsuarioAdmin): void {
    this.editandoUsuario = u;
    this.editUsuarioRol = u.rol;
    this.cdr.markForCheck();
  }

  guardarRolUsuario(): void {
    if (!this.editandoUsuario) {
      return;
    }
    this.admin.actualizarRolUsuario(this.editandoUsuario.id, this.editUsuarioRol).subscribe({
      next: (actualizado) => {
        const idx = this.usuarios.findIndex((x) => x.id === actualizado.id);
        if (idx >= 0) {
          this.usuarios[idx] = actualizado;
        }
        this.editandoUsuario = null;
        this.notify.success('Rol de usuario actualizado.');
        this.cdr.markForCheck();
      },
      error: (err) => this.notify.error(this.mensajeError(err))
    });
  }

  rolEtiqueta(rol: string): string {
    return roleLabel(rol);
  }

  esRolProtegido(nombre: string): boolean {
    return nombre === 'ADMIN';
  }

  hayCambiosPermisos(): boolean {
    if (this.permisosSeleccionados.size !== this.permisosOriginales.size) {
      return true;
    }
    for (const p of this.permisosSeleccionados) {
      if (!this.permisosOriginales.has(p)) {
        return true;
      }
    }
    return false;
  }

  private mensajeError(err: unknown): string {
    const e = err as { error?: { message?: string; mensaje?: string } };
    return e?.error?.message || e?.error?.mensaje || 'Operación no completada';
  }
}
