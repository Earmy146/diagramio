-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `plan` ENUM('FREE', 'PRO', 'TEAM') NOT NULL DEFAULT 'FREE',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `token` VARCHAR(512) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_key`(`token`),
    INDEX `refresh_tokens_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `guest_token` VARCHAR(255) NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `slug` VARCHAR(300) NOT NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT false,
    `thumbnail_url` VARCHAR(500) NULL,
    `default_dialect` ENUM('MYSQL', 'POSTGRESQL', 'SQLITE', 'NOSQL') NOT NULL DEFAULT 'MYSQL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `projects_slug_key`(`slug`),
    INDEX `projects_user_id_idx`(`user_id`),
    INDEX `projects_guest_token_idx`(`guest_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `diagrams` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL DEFAULT 'Main Diagram',
    `canvas_state` JSON NULL,
    `zoom_level` DOUBLE NOT NULL DEFAULT 1.0,
    `pan_x` INTEGER NOT NULL DEFAULT 0,
    `pan_y` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `diagrams_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `erd_tables` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `diagram_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(255) NULL,
    `pos_x` INTEGER NOT NULL DEFAULT 0,
    `pos_y` INTEGER NOT NULL DEFAULT 0,
    `color` VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `erd_tables_diagram_id_idx`(`diagram_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `erd_columns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `table_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `data_type` VARCHAR(100) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `is_unique` BOOLEAN NOT NULL DEFAULT false,
    `is_nullable` BOOLEAN NOT NULL DEFAULT true,
    `is_auto_increment` BOOLEAN NOT NULL DEFAULT false,
    `is_foreign` BOOLEAN NOT NULL DEFAULT false,
    `default_value` VARCHAR(255) NULL,
    `comment` VARCHAR(500) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `erd_columns_table_id_idx`(`table_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `relationships` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `diagram_id` INTEGER NOT NULL,
    `from_table_id` INTEGER NOT NULL,
    `from_column_id` INTEGER NOT NULL,
    `to_table_id` INTEGER NOT NULL,
    `to_column_id` INTEGER NOT NULL,
    `rel_type` ENUM('ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY') NOT NULL DEFAULT 'ONE_TO_MANY',
    `label` VARCHAR(255) NULL,
    `on_delete` ENUM('CASCADE', 'RESTRICT', 'SET_NULL', 'NO_ACTION') NOT NULL DEFAULT 'RESTRICT',
    `on_update` ENUM('CASCADE', 'RESTRICT', 'SET_NULL', 'NO_ACTION') NOT NULL DEFAULT 'CASCADE',

    INDEX `relationships_diagram_id_idx`(`diagram_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_versions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `snapshot` JSON NOT NULL,
    `message` VARCHAR(500) NULL,
    `version_number` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_versions_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sql_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `content` LONGTEXT NOT NULL,
    `dialect` ENUM('MYSQL', 'POSTGRESQL', 'SQLITE', 'NOSQL') NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sql_files_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shared_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `permission` ENUM('VIEW', 'EDIT') NOT NULL DEFAULT 'VIEW',
    `expires_at` DATETIME(3) NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `shared_links_token_key`(`token`),
    INDEX `shared_links_token_idx`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_collaborators` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `role` ENUM('VIEWER', 'EDITOR', 'ADMIN') NOT NULL DEFAULT 'VIEWER',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `project_collaborators_project_id_user_id_key`(`project_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(100) NOT NULL,
    `canvas_data` JSON NOT NULL,
    `sql_content` LONGTEXT NOT NULL,
    `dialect` ENUM('MYSQL', 'POSTGRESQL', 'SQLITE', 'NOSQL') NOT NULL DEFAULT 'MYSQL',
    `is_official` BOOLEAN NOT NULL DEFAULT false,
    `use_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `diagram_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `table_id` INTEGER NULL,
    `content` TEXT NOT NULL,
    `pos_x` INTEGER NOT NULL DEFAULT 0,
    `pos_y` INTEGER NOT NULL DEFAULT 0,
    `is_resolved` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `comments_diagram_id_idx`(`diagram_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diagrams` ADD CONSTRAINT `diagrams_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `erd_tables` ADD CONSTRAINT `erd_tables_diagram_id_fkey` FOREIGN KEY (`diagram_id`) REFERENCES `diagrams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `erd_columns` ADD CONSTRAINT `erd_columns_table_id_fkey` FOREIGN KEY (`table_id`) REFERENCES `erd_tables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relationships` ADD CONSTRAINT `relationships_diagram_id_fkey` FOREIGN KEY (`diagram_id`) REFERENCES `diagrams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relationships` ADD CONSTRAINT `relationships_from_table_id_fkey` FOREIGN KEY (`from_table_id`) REFERENCES `erd_tables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relationships` ADD CONSTRAINT `relationships_from_column_id_fkey` FOREIGN KEY (`from_column_id`) REFERENCES `erd_columns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relationships` ADD CONSTRAINT `relationships_to_table_id_fkey` FOREIGN KEY (`to_table_id`) REFERENCES `erd_tables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relationships` ADD CONSTRAINT `relationships_to_column_id_fkey` FOREIGN KEY (`to_column_id`) REFERENCES `erd_columns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_versions` ADD CONSTRAINT `project_versions_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_versions` ADD CONSTRAINT `project_versions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sql_files` ADD CONSTRAINT `sql_files_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shared_links` ADD CONSTRAINT `shared_links_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_collaborators` ADD CONSTRAINT `project_collaborators_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_collaborators` ADD CONSTRAINT `project_collaborators_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_diagram_id_fkey` FOREIGN KEY (`diagram_id`) REFERENCES `diagrams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
