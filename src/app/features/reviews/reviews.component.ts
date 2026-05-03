import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { AdminService } from '../../core/services/admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface Review {
  id: string;
  employeeId: string;
  employeeName: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  isVisible: boolean;
  photos?: string[];
  tags?: string[];
  createdAt: string;
}

@Component({
  selector: 'app-reviews',
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss']
})
export class ReviewsComponent implements OnInit {
  displayedColumns: string[] = ['userName', 'employeeName', 'rating', 'comment', 'visible', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<Review>([]);
  allReviews: Review[] = [];
  isLoading = false;
  totalElements = 0;
  pageSize = 20;
  currentPage = 0;

  // REV-01: Rating filter
  filterRating = 0;
  
  // REV-02: Employee search filter
  filterEmployee = '';
  
  // REV-03: Visibility filter
  filterVisibility = '';

  // Rating options for filter
  ratingOptions = [
    { value: 0, label: 'Toutes les notes' },
    { value: 5, label: '5 étoiles' },
    { value: 4, label: '4 étoiles et +' },
    { value: 3, label: '3 étoiles et +' },
    { value: 2, label: '2 étoiles et +' },
    { value: 1, label: '1 étoile et +' }
  ];

  // Stats
  averageRating = 0;
  totalReviews = 0;
  ratingDistribution = [0, 0, 0, 0, 0];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading = true;
    this.adminService.getReviews(this.currentPage, this.pageSize).subscribe({
      next: (data: any) => {
        console.log('Reviews data received:', data);
        let reviews: Review[] = [];
        // Handle both paginated and non-paginated responses
        if (data?.content) {
          reviews = data.content;
          this.totalElements = data.totalElements || 0;
        } else if (Array.isArray(data)) {
          reviews = data;
          this.totalElements = data.length;
        }
        
        this.allReviews = reviews;
        this.calculateStats();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des avis', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  // REV-05: Calculate global stats
  calculateStats(): void {
    if (this.allReviews.length === 0) {
      this.averageRating = 0;
      this.totalReviews = 0;
      this.ratingDistribution = [0, 0, 0, 0, 0];
      return;
    }

    this.totalReviews = this.allReviews.length;
    
    // Calculate average
    const sum = this.allReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    this.averageRating = Math.round((sum / this.totalReviews) * 10) / 10;
    
    // Calculate distribution (1-5 stars)
    this.ratingDistribution = [0, 0, 0, 0, 0];
    this.allReviews.forEach(r => {
      const idx = Math.floor(r.rating) - 1;
      if (idx >= 0 && idx < 5) {
        this.ratingDistribution[idx]++;
      }
    });
  }

  // REV-01, REV-02: Apply all filters
  applyFilters(): void {
    let filtered = [...this.allReviews];

    // REV-01: Rating filter
    if (this.filterRating > 0) {
      filtered = filtered.filter(r => r.rating >= this.filterRating);
    }

    // REV-02: Employee search filter
    if (this.filterEmployee) {
      const query = this.filterEmployee.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r.employeeName?.toLowerCase().includes(query) ||
        r.employeeId?.toLowerCase().includes(query)
      );
    }

    // REV-03: Visibility filter
    if (this.filterVisibility === 'visible') {
      filtered = filtered.filter(r => r.isVisible);
    } else if (this.filterVisibility === 'hidden') {
      filtered = filtered.filter(r => !r.isVisible);
    }

    this.dataSource.data = filtered;
  }

  // Handle filter changes
  onFilterChange(): void {
    this.applyFilters();
  }

  // Clear all filters
  clearFilters(): void {
    this.filterRating = 0;
    this.filterEmployee = '';
    this.filterVisibility = '';
    this.applyFilters();
  }

  // Check if any filter is active
  hasActiveFilters(): boolean {
    return this.filterRating > 0 || !!this.filterEmployee || !!this.filterVisibility;
  }

  // Get rating label for filter
  getRatingLabel(): string {
    if (this.filterRating === 5) return '5 étoiles';
    if (this.filterRating > 0) return `${this.filterRating}+ étoiles`;
    return 'Toutes';
  }

  // Get percentage for rating bar
  getRatingPercentage(index: number): number {
    if (this.totalReviews === 0) return 0;
    return (this.ratingDistribution[index] / this.totalReviews) * 100;
  }

  toggleVisibility(review: Review): void {
    this.adminService.toggleReviewVisibility(review.id, !review.isVisible).subscribe({
      next: () => {
        review.isVisible = !review.isVisible;
        this.snackBar.open(
          `Avis ${review.isVisible ? 'visible' : 'masqué'}`,
          'Fermer',
          { duration: 3000 }
        );
      },
      error: () => {
        this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadReviews();
  }
}
