import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { ApiService } from '../../core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon?: string;
  imageUrl?: string;
  color?: string;
  isActive: boolean;
  displayOrder: number;
}

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];
  isLoading = false;
  isEditing = false;
  editingCategory: Category | null = null;
  categoryForm: FormGroup;
  imageUploading = false;

  // Liste des icônes disponibles
  availableIcons = [
    { value: 'plumbing', label: 'Plomberie' },
    { value: 'electrical_services', label: 'Électricité' },
    { value: 'cleaning_services', label: 'Nettoyage' },
    { value: 'handyman', label: 'Bricolage' },
    { value: 'carpenter', label: 'Menuiserie' },
    { value: 'format_paint', label: 'Peinture' },
    { value: 'ac_unit', label: 'Climatisation' },
    { value: 'roofing', label: 'Toiture' },
    { value: 'local_florist', label: 'Jardinage' },
    { value: 'home_repair_service', label: 'Réparation' },
    { value: 'construction', label: 'Construction' },
    { value: 'kitchen', label: 'Cuisine' },
    { value: 'security', label: 'Sécurité' },
    { value: 'local_shipping', label: 'Déménagement' },
    { value: 'car_repair', label: 'Mécanique auto' },
    { value: 'spa', label: 'Bien-être' },
    { value: 'child_care', label: 'Garde d\'enfants' },
    { value: 'school', label: 'Cours particuliers' },
    { value: 'pets', label: 'Services animaux' },
    { value: 'photo_camera', label: 'Photographie' },
    { value: 'brush', label: 'Design' },
    { value: 'computer', label: 'Informatique' },
    { value: 'smartphone', label: 'Téléphonie' },
    { value: 'local_laundry_service', label: 'Blanchisserie' },
    { value: 'iron', label: 'Repassage' },
    { value: 'shopping_cart', label: 'Courses' },
    { value: 'restaurant', label: 'Restauration' },
    { value: 'cake', label: 'Pâtisserie' },
    { value: 'content_cut', label: 'Coiffure' },
    { value: 'medical_services', label: 'Soins médicaux' },
    { value: 'category', label: 'Autre' },
  ];

  constructor(
    private adminService: AdminService,
    private apiService: ApiService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      nameAr: ['', Validators.required],
      icon: ['category'],
      imageUrl: [''],
      color: ['#3b82f6'],
      displayOrder: [0, Validators.required],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.adminService.getCategories().subscribe({
      next: (data: any) => {
        const raw = Array.isArray(data) ? data : data?.content ?? [];
        this.categories = raw.map((c: any) => ({
          ...c,
          imageUrl: c.imageUrl ?? c.image_url ?? null,
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des catégories', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  startEdit(category: Category): void {
    this.isEditing = true;
    this.editingCategory = category;
    this.categoryForm.patchValue({
      name: category.name,
      nameAr: category.nameAr,
      icon: category.icon || 'category',
      imageUrl: category.imageUrl || '',
      color: category.color || '#3b82f6',
      displayOrder: category.displayOrder || 0,
      isActive: category.isActive !== false,
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingCategory = null;
    this.categoryForm.reset({ color: '#3b82f6', displayOrder: 0, icon: 'category', imageUrl: '', isActive: true });
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      this.snackBar.open('Veuillez sélectionner une image (JPG, PNG, etc.)', 'Fermer', { duration: 3000 });
      return;
    }
    this.imageUploading = true;
    this.adminService.uploadImage(file).subscribe({
      next: (result) => {
        this.categoryForm.patchValue({ imageUrl: result.path });
        this.imageUploading = false;
        this.snackBar.open('Image enregistrée dans le storage', 'Fermer', { duration: 2000 });
        input.value = '';
      },
      error: () => {
        this.imageUploading = false;
        this.snackBar.open('Erreur lors du téléversement de l\'image', 'Fermer', { duration: 3000 });
      },
    });
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) {
      return;
    }

    const categoryData = this.categoryForm.value;

    if (this.editingCategory) {
      this.adminService.updateCategory(this.editingCategory.id, categoryData).subscribe({
        next: () => {
          this.snackBar.open('Catégorie mise à jour', 'Fermer', { duration: 3000 });
          this.cancelEdit();
          this.loadCategories();
        },
        error: (err) => {
          console.error('Error updating category:', err);
          this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', {
            duration: 3000,
          });
        },
      });
    } else {
      this.adminService.createCategory(categoryData).subscribe({
        next: () => {
          this.snackBar.open('Catégorie créée', 'Fermer', { duration: 3000 });
          this.cancelEdit();
          this.loadCategories();
        },
        error: (err) => {
          console.error('Error creating category:', err);
          this.snackBar.open('Erreur lors de la création', 'Fermer', {
            duration: 3000,
          });
        },
      });
    }
  }

  toggleStatus(category: Category): void {
    const newStatus = !category.isActive;
    this.adminService.toggleCategoryStatus(category.id, newStatus).subscribe({
      next: () => {
        category.isActive = newStatus;
        this.snackBar.open(
          `Catégorie ${newStatus ? 'activée' : 'désactivée'}`,
          'Fermer',
          { duration: 3000 }
        );
      },
      error: (err) => {
        console.error('Error toggling category status:', err);
        this.snackBar.open('Erreur lors de la mise à jour du statut', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  getCategoryImageUrl(category: Category): string | null {
    const pathOrUrl = category?.imageUrl ?? (category as any)?.image_url ?? null;
    return this.getImageDisplayUrl(pathOrUrl);
  }

  /** Build full image URL from path (storage path like "images/xxx.jpg") or return URL as-is */
  getImageDisplayUrl(pathOrUrl: string | null | undefined): string | null {
    if (!pathOrUrl) return null;
    if (pathOrUrl.startsWith('http')) return pathOrUrl;
    return this.apiService.getFilesBaseUrl() + pathOrUrl;
  }

  onCategoryImageError(category: Category): void {
    category.imageUrl = undefined;
    this.categories = [...this.categories];
  }

  deleteCategory(category: Category): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`)) {
      this.adminService.deleteCategory(category.id).subscribe({
        next: () => {
          this.snackBar.open('Catégorie supprimée', 'Fermer', { duration: 3000 });
          this.loadCategories();
        },
        error: (err) => {
          console.error('Error deleting category:', err);
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', {
            duration: 3000,
          });
        },
      });
    }
  }
}
