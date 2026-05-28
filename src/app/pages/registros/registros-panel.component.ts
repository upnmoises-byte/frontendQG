import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Material } from '../../models/material.model';
import { CatalogoEspecial } from '../../models/catalogo-especial.model';
import { MaterialService } from '../../services/material.service';
import { CatalogoEspecialService } from '../../services/catalogo-especial.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { DialogService } from '../../services/dialog.service';

@Component({
  selector: 'app-registros-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registros-panel.component.html',
  styleUrl: './registros-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistrosPanelComponent implements OnInit {
  pestana: 'MATERIALES' | 'ESPECIALES' = 'MATERIALES';

  materiales: Material[] = [];
  materialesFiltrados: Material[] = [];
  busquedaMaterial = '';
  filtroMarca = '';
  filtroTipo = '';
  filtroActivoMaterial = '';

  especiales: CatalogoEspecial[] = [];
  especialesFiltrados: CatalogoEspecial[] = [];
  busquedaEspecial = '';
  filtroActivoEspecial = '';

  mostrarModalMaterial = false;
  mostrarModalEspecial = false;
  modoEdicion = false;
  guardando = false;
  materialForm: Material = this.materialVacio();
  especialForm: CatalogoEspecial = this.especialVacio();

  constructor(
    private materialService: MaterialService,
    private catalogoEspecialService: CatalogoEspecialService,
    readonly auth: AuthService,
    private notify: NotificationService,
    private dialog: DialogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarMateriales();
    this.cargarEspeciales();
  }

  esAdmin(): boolean {
    return this.auth.hasRole('ADMIN');
  }

  cambiarPestana(p: 'MATERIALES' | 'ESPECIALES'): void {
    this.pestana = p;
    this.cdr.markForCheck();
  }

  cargarMateriales(): void {
    this.materialService.listar().subscribe({
      next: (lista) => {
        this.materiales = lista || [];
        this.filtrarMateriales();
        this.cdr.markForCheck();
      },
      error: (err) => this.notify.error(this.mensajeError(err, 'No se pudieron cargar los materiales'))
    });
  }

  cargarEspeciales(): void {
    this.catalogoEspecialService.listar().subscribe({
      next: (lista) => {
        this.especiales = lista || [];
        this.filtrarEspeciales();
        this.cdr.markForCheck();
      },
      error: (err) => this.notify.error(this.mensajeError(err, 'No se pudieron cargar los especiales'))
    });
  }

  filtrarMateriales(): void {
    const q = this.busquedaMaterial.trim().toUpperCase();
    this.materialesFiltrados = this.materiales.filter((m) => {
      if (this.filtroMarca && (m.marca || '').toUpperCase() !== this.filtroMarca) {
        return false;
      }
      if (this.filtroTipo && (m.tipo || '').toUpperCase() !== this.filtroTipo) {
        return false;
      }
      if (this.filtroActivoMaterial === 'ACTIVO' && !m.activo) {
        return false;
      }
      if (this.filtroActivoMaterial === 'INACTIVO' && m.activo) {
        return false;
      }
      if (!q) {
        return true;
      }
      const texto = `${m.nombre} ${m.marca || ''} ${m.color || ''}`.toUpperCase();
      return texto.includes(q);
    });
    this.cdr.markForCheck();
  }

  filtrarEspeciales(): void {
    const q = this.busquedaEspecial.trim().toUpperCase();
    this.especialesFiltrados = this.especiales.filter((e) => {
      if (this.filtroActivoEspecial === 'ACTIVO' && !e.activo) {
        return false;
      }
      if (this.filtroActivoEspecial === 'INACTIVO' && e.activo) {
        return false;
      }
      if (!q) {
        return true;
      }
      const texto = `${e.nombre} ${e.descripcion || ''}`.toUpperCase();
      return texto.includes(q);
    });
    this.cdr.markForCheck();
  }

  limpiarFiltrosMateriales(): void {
    this.busquedaMaterial = '';
    this.filtroMarca = '';
    this.filtroTipo = '';
    this.filtroActivoMaterial = '';
    this.filtrarMateriales();
  }

  limpiarFiltrosEspeciales(): void {
    this.busquedaEspecial = '';
    this.filtroActivoEspecial = '';
    this.filtrarEspeciales();
  }

  abrirNuevoMaterial(): void {
    this.modoEdicion = false;
    this.materialForm = this.materialVacio();
    this.mostrarModalMaterial = true;
    this.cdr.markForCheck();
  }

  abrirEditarMaterial(m: Material): void {
    this.modoEdicion = true;
    this.materialForm = { ...m };
    this.mostrarModalMaterial = true;
    this.cdr.markForCheck();
  }

  cerrarModalMaterial(): void {
    this.mostrarModalMaterial = false;
    this.cdr.markForCheck();
  }

  guardarMaterial(): void {
    if (!this.materialForm.nombre?.trim()) {
      this.notify.warning('El nombre del material es obligatorio');
      return;
    }
    this.guardando = true;
    const payload = { ...this.materialForm };
    const req = this.modoEdicion && payload.id
      ? this.materialService.actualizar(payload.id, payload)
      : this.materialService.crear(payload);

    req.subscribe({
      next: () => {
        this.guardando = false;
        this.notify.success(
          this.modoEdicion ? 'Material actualizado correctamente' : 'Material registrado correctamente'
        );
        this.cerrarModalMaterial();
        this.cargarMateriales();
      },
      error: (err) => {
        this.guardando = false;
        this.notify.error(this.mensajeError(err, 'No se pudo guardar el material'));
        this.cdr.markForCheck();
      }
    });
  }

  async toggleMaterial(m: Material): Promise<void> {
    if (!m.id) {
      return;
    }
    const activar = !m.activo;
    const ok = await this.dialog.confirm({
      title: activar ? 'Activar material' : 'Desactivar material',
      message: activar
        ? `¿Desea activar "${m.nombre}"?`
        : `¿Desea desactivar "${m.nombre}"? Ya no aparecerá en nuevos pedidos.`,
      confirmText: activar ? 'Activar' : 'Desactivar',
      variant: activar ? 'confirm' : 'warning'
    });
    if (!ok) {
      return;
    }
    this.materialService.cambiarEstado(m.id, activar).subscribe({
      next: () => {
        this.notify.success(activar ? 'Material activado' : 'Material desactivado');
        this.cargarMateriales();
      },
      error: (err) => this.notify.error(this.mensajeError(err, 'No se pudo cambiar el estado'))
    });
  }

  async eliminarMaterial(m: Material): Promise<void> {
    if (!m.id) {
      return;
    }
    const ok = await this.dialog.confirm({
      title: 'Eliminar material',
      message: `¿Desea eliminar el material "${m.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      variant: 'danger'
    });
    if (!ok) {
      return;
    }
    this.materialService.eliminar(m.id).subscribe({
      next: () => {
        this.notify.success('Material eliminado correctamente');
        this.cargarMateriales();
      },
      error: (err) => this.notify.error(this.mensajeError(err, 'No se pudo eliminar el material'))
    });
  }

  abrirNuevoEspecial(): void {
    this.modoEdicion = false;
    this.especialForm = this.especialVacio();
    this.mostrarModalEspecial = true;
    this.cdr.markForCheck();
  }

  abrirEditarEspecial(e: CatalogoEspecial): void {
    this.modoEdicion = true;
    this.especialForm = { ...e };
    this.mostrarModalEspecial = true;
    this.cdr.markForCheck();
  }

  cerrarModalEspecial(): void {
    this.mostrarModalEspecial = false;
    this.cdr.markForCheck();
  }

  guardarEspecial(): void {
    if (!this.especialForm.nombre?.trim()) {
      this.notify.warning('El nombre del especial es obligatorio');
      return;
    }
    this.guardando = true;
    const payload = { ...this.especialForm };
    const req = this.modoEdicion && payload.id
      ? this.catalogoEspecialService.actualizar(payload.id, payload)
      : this.catalogoEspecialService.crear(payload);

    req.subscribe({
      next: () => {
        this.guardando = false;
        this.notify.success(
          this.modoEdicion ? 'Especial actualizado correctamente' : 'Especial registrado correctamente'
        );
        this.cerrarModalEspecial();
        this.cargarEspeciales();
      },
      error: (err) => {
        this.guardando = false;
        this.notify.error(this.mensajeError(err, 'No se pudo guardar el especial'));
        this.cdr.markForCheck();
      }
    });
  }

  async toggleEspecial(e: CatalogoEspecial): Promise<void> {
    if (!e.id) {
      return;
    }
    const activar = !e.activo;
    const ok = await this.dialog.confirm({
      title: activar ? 'Activar especial' : 'Desactivar especial',
      message: activar
        ? `¿Desea activar "${e.nombre}"?`
        : `¿Desea desactivar "${e.nombre}"?`,
      confirmText: activar ? 'Activar' : 'Desactivar',
      variant: activar ? 'confirm' : 'warning'
    });
    if (!ok) {
      return;
    }
    this.catalogoEspecialService.cambiarEstado(e.id, activar).subscribe({
      next: () => {
        this.notify.success(activar ? 'Especial activado' : 'Especial desactivado');
        this.cargarEspeciales();
      },
      error: (err) => this.notify.error(this.mensajeError(err, 'No se pudo cambiar el estado'))
    });
  }

  async eliminarEspecial(e: CatalogoEspecial): Promise<void> {
    if (!e.id) {
      return;
    }
    const ok = await this.dialog.confirm({
      title: 'Eliminar especial',
      message: `¿Desea eliminar el especial "${e.nombre}"?`,
      confirmText: 'Eliminar',
      variant: 'danger'
    });
    if (!ok) {
      return;
    }
    this.catalogoEspecialService.eliminar(e.id).subscribe({
      next: () => {
        this.notify.success('Especial eliminado correctamente');
        this.cargarEspeciales();
      },
      error: (err) => this.notify.error(this.mensajeError(err, 'No se pudo eliminar el especial'))
    });
  }

  private materialVacio(): Material {
    return {
      nombre: '',
      marca: 'PELIKANO',
      color: '',
      tipo: 'NORMAL',
      espesor: '18MM',
      medida: '2.44 x 2.15',
      activo: true
    };
  }

  private especialVacio(): CatalogoEspecial {
    return { nombre: '', descripcion: '', activo: true };
  }

  private mensajeError(err: unknown, fallback: string): string {
    const e = err as { error?: { message?: string }; message?: string };
    return e?.error?.message || e?.message || fallback;
  }
}
